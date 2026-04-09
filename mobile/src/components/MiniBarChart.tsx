import { View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { Colors } from "../constants/colors";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  width: number;
  height: number;
  color?: string;
}

export function MiniBarChart({
  data,
  width,
  height,
  color = Colors.primary,
}: Props) {
  if (data.length === 0) return <View style={{ width, height }} />;

  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(chartW / data.length - 4, 24);
  const gap = (chartW - barW * data.length) / (data.length + 1);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = padL + gap + i * (barW + gap);
        const y = padT + chartH - barH;
        return (
          <View key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={color}
              opacity={0.8}
            />
            <SvgText
              x={x + barW / 2}
              y={height - 4}
              fontSize={9}
              fill={Colors.gray400}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </View>
        );
      })}
      {/* Y max */}
      <SvgText
        x={padL - 4}
        y={padT + 4}
        fontSize={9}
        fill={Colors.gray400}
        textAnchor="end"
      >
        {maxVal}
      </SvgText>
    </Svg>
  );
}
