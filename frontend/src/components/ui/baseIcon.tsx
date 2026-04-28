import React from "react"

export type BaseIconProps = Omit<React.SVGProps<SVGSVGElement>, "width" | "height"> & {
  size?: number
}

export const BaseIcon: React.FC<BaseIconProps> = ({
  viewBox = "0 0 24 24",
  size = 24,
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 2,
  strokeLinecap = "round",
  strokeLinejoin = "round",
  children,
  ...rest
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox={viewBox}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap={strokeLinecap}
    strokeLinejoin={strokeLinejoin}
    {...rest}
  >
    {children}
  </svg>
)
