import React from "react";

interface Props {
  text?: string;
}

export const Loading: React.FC<Props> = ({ text }) => {
  return <span className="text-shadow">{text || "Loading..."}</span>;
};
