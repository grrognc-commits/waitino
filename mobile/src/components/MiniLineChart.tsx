import { View } from "react-native";
import Svg, { Polyline, Line, Text as SvgText } from "react-native-svg";
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

export function MiniLineChart({
  data,
  width,
  height,
  color = Colors.primary,
}: Props) {
  if (data.length < 2) return <View style={{ width, height }} />;

  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const stepX = chartW / (data.length - 1);

  const points = data
    .map((d, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH - (d.value / maxVal) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      {[0, 0.5, 1].map((ratio) => {
        const y = padT + chartH * (1 - ratio);
        return (
          <Line
            key={ratio}
            x1={padL}
            y1={y}
            x2={width - padR}
            y2={y}
            stroke={Colors.gray200}
            strokeWidth={1}
          />
        );
      })}
      {/* Data line */}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* X labels (show every other for readability) */}
      {data.map((d, i) => {
        if (data.length > 8 && i % 2 !== 0) return null;
        const x = padL + i * stepX;
        return (
          <SvgText
            key={i}
            x={x}
            y={height - 4}
            fontSize={9}
            fill={Colors.gray400}
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        );
      })}
      {/* Y max label */}
      <SvgText
        x={padL - 4}
        y={padT + 4}
        fontSize={9}
        fill={Colors.gray400}
        textAnchor="end"
      >
        {maxVal}
      </SvgText>
      <SvgText
        x={padL - 4}
        y={padT + chartH + 4}
        fontSize={9}
        fill={Colors.gray400}
        textAnchor="end"
      >
        0
      </SvgText>
    </Svg>
  );
}
