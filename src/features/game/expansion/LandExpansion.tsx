import React, { useRef } from "react";
import ScrollContainer from "react-indiana-drag-scroll";

import { useLocation, useParams } from "react-router-dom";
import { GameProvider } from "../GameProvider";
import { Game } from "./Game";
import { ModalProvider } from "../components/modal/ModalProvider";
import { GameBoard } from "components/GameBoard";

export const LandExpansion: React.FC = () => {
  // catching and passing scroll container to keyboard listeners
  const container = useRef(null);
  const { id } = useParams();
  const location = useLocation();

  const isDawnBreaker = location.pathname.includes("dawn-breaker");

  // Load data
  return (
    <GameProvider key={id}>
      <ModalProvider>
        <ScrollContainer
          className="bg-blue-300 overflow-scroll relative w-full h-full page-scroll-container overscroll-none"
          innerRef={container}
          ignoreElements={"*[data-prevent-drag-scroll]"}
        >
          <GameBoard isDawnBreaker={isDawnBreaker}>
            <Game />
          </GameBoard>
        </ScrollContainer>
      </ModalProvider>
    </GameProvider>
  );
};
