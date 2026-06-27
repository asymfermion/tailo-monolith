import { Path, Svg } from 'react-native-svg';

type HomeIconProps = {
  color: string;
  size: number;
};

// Icon / Home — path from Figma node 338:21.
export function HomeIcon({ color, size }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 10.5L12 3.8L20.5 10.5V18.7C20.5 19.7 19.7 20.5 18.7 20.5H14.5V14.3H9.5V20.5H5.3C4.3 20.5 3.5 19.7 3.5 18.7V10.5Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
