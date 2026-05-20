# Validate DATABASE_URL before passing to psql / supabase db query.

validate_database_url() {
  local url="$1"

  if [[ -z "$url" ]]; then
    echo "error: DATABASE_URL is empty" >&2
    return 1
  fi

  if [[ "$url" != postgresql://* && "$url" != postgres://* ]]; then
    echo "error: DATABASE_URL must start with postgresql:// (or postgres://)" >&2
    return 1
  fi

  # More than one @ means @ in the password was not encoded as %40
  local at_count=0
  local index
  for ((index = 0; index < ${#url}; index += 1)); do
    if [[ "${url:index:1}" == '@' ]]; then
      at_count=$((at_count + 1))
    fi
  done

  if [[ "$at_count" -gt 1 ]]; then
    echo "error: DATABASE_URL contains multiple @ characters." >&2
    echo "       Your database password likely includes @ — it must be percent-encoded in the URI." >&2
    echo "       Fix: Supabase Dashboard → Connect → copy the full URI (do not build it by hand)." >&2
    return 1
  fi

  # Literal % in password must be %25; otherwise parsers fail on sequences like %LA
  if [[ "$url" =~ %[^0-9A-Fa-f%] || "$url" =~ %[0-9A-Fa-f][^0-9A-Fa-f] || "$url" =~ %$ ]]; then
    echo "error: DATABASE_URL has an invalid percent-encoding (e.g. %LA in the password)." >&2
    echo "       Encode % as %25 in the password, or paste the URI from Dashboard → Connect." >&2
    return 1
  fi

  return 0
}
