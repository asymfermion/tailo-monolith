import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
} from 'react-native-svg';

type Props = { size?: number };

export function PetPortraitPlaceholder({ size = 145 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 145 145">
      <Defs>
        <ClipPath id="portrait-outer">
          <Circle cx="72.5" cy="72.5" r="72.5" />
        </ClipPath>
      </Defs>

      <G clipPath="url(#portrait-outer)">
        {/* Background */}
        <Circle cx="72.5" cy="72.5" r="72.5" fill="#F5EDD8" />

        {/* Dog – right side -------------------------------------------- */}
        {/* Floppy ears behind head */}
        <Ellipse cx="80" cy="88" rx="12" ry="19" fill="#B5732A" />
        <Ellipse cx="126" cy="88" rx="12" ry="19" fill="#B5732A" />
        {/* Head */}
        <Circle cx="103" cy="82" r="30" fill="#C4873A" />
        {/* Eyes */}
        <Circle cx="96" cy="77" r="5" fill="#2C1810" />
        <Circle cx="110" cy="77" r="5" fill="#2C1810" />
        <Circle cx="98" cy="75" r="2" fill="#FFFFFF" />
        <Circle cx="112" cy="75" r="2" fill="#FFFFFF" />
        {/* Nose */}
        <Ellipse cx="103" cy="87" rx="8" ry="6" fill="#2C1810" />
        <Circle cx="100" cy="85" r="2" fill="#3D2818" />
        {/* Smile + tongue */}
        <Path
          d="M 96 94 Q 103 100 110 94"
          stroke="#2C1810"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <Ellipse cx="103" cy="100" rx="6" ry="5" fill="#E08080" />
        <Path
          d="M 103 96 L 103 105"
          stroke="#D06060"
          strokeWidth="1"
          fill="none"
        />

        {/* Cat – left side --------------------------------------------- */}
        {/* Outer ear triangles behind head */}
        <Polygon points="22,62 34,30 48,62" fill="#D07850" />
        <Polygon points="36,62 50,30 62,62" fill="#D07850" />
        {/* Inner ear */}
        <Polygon points="26,60 34,38 44,60" fill="#F4A880" />
        <Polygon points="38,60 48,38 58,60" fill="#F4A880" />
        {/* Head */}
        <Circle cx="42" cy="82" r="30" fill="#E09060" />
        {/* Eyes */}
        <Circle cx="35" cy="77" r="5" fill="#2C1810" />
        <Circle cx="49" cy="77" r="5" fill="#2C1810" />
        <Circle cx="37" cy="75" r="2" fill="#FFFFFF" />
        <Circle cx="51" cy="75" r="2" fill="#FFFFFF" />
        {/* Nose */}
        <Polygon points="40,85 44,85 42,89" fill="#D06060" />
        {/* Mouth */}
        <Path
          d="M 38 91 Q 42 95 46 91"
          stroke="#2C1810"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Whiskers */}
        <Line
          x1="15"
          y1="84"
          x2="32"
          y2="86"
          stroke="#2C1810"
          strokeWidth="1"
        />
        <Line
          x1="15"
          y1="90"
          x2="32"
          y2="89"
          stroke="#2C1810"
          strokeWidth="1"
        />
        <Line
          x1="52"
          y1="86"
          x2="69"
          y2="84"
          stroke="#2C1810"
          strokeWidth="1"
        />
        <Line
          x1="52"
          y1="89"
          x2="69"
          y2="90"
          stroke="#2C1810"
          strokeWidth="1"
        />

        {/* Toy ball above them */}
        <Circle cx="72.5" cy="42" r="10" fill="#E07050" />
        <Path
          d="M 63 42 Q 72.5 50 82 42"
          stroke="#C05030"
          strokeWidth="1.5"
          fill="none"
        />
        <Path
          d="M 63 42 Q 72.5 34 82 42"
          stroke="#C05030"
          strokeWidth="1.5"
          fill="none"
        />
      </G>
    </Svg>
  );
}
