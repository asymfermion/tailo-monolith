import { createContext, useCallback, useContext } from 'react';

const ModalDismissContext = createContext<(() => void) | null>(null);

export function useModalDismiss(fallback: () => void): () => void {
  const dismiss = useContext(ModalDismissContext);

  return useCallback(() => {
    if (dismiss) {
      dismiss();
      return;
    }

    fallback();
  }, [dismiss, fallback]);
}

export { ModalDismissContext };
