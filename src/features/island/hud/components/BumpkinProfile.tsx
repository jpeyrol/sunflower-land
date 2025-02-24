import React, { useContext, useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { useActor } from "@xstate/react";
import * as AuthProvider from "features/auth/lib/Provider";

import progressBarSprite from "assets/ui/profile/progress_bar_sprite.png";
import whiteBg from "assets/ui/profile/bg.png";

import { BumpkinModal } from "features/bumpkins/components/BumpkinModal";
import { DynamicNFT } from "features/bumpkins/components/DynamicNFT";
import { Context } from "features/game/GameProvider";
import {
  getBumpkinLevel,
  getExperienceToNextLevel,
  isMaxLevel,
} from "features/game/lib/level";
import {
  acknowledgeSkillPoints,
  hasUnacknowledgedSkillPoints,
} from "features/island/bumpkin/lib/skillPointStorage";
import Spritesheet, {
  SpriteSheetInstance,
} from "components/animation/SpriteAnimator";
import { Bumpkin } from "features/game/types/game";
import classNames from "classnames";
import { SUNNYSIDE } from "assets/sunnyside";
import { SpringValue } from "@react-spring/web";

const DIMENSIONS = {
  original: 80,
  scaled: 160,
  bumpkinContainer: {
    width: 130,
    height: 125,
    radiusBottomLeft: 85,
    radiusBottomRight: 45,
  },
  bumpkin: {
    width: 200,
    marginLeft: -10,
  },
  noBumpkin: {
    marginLeft: 48,
    marginTop: 20,
  },
  level: {
    width: 24,
    height: 12,
    marginLeft: 108,
    marginTop: 84,
  },
  skillsMark: {
    width: 10,
    marginLeft: 116,
    marginTop: 45,
  },
};

const SPRITE_STEPS = 51;

interface AvatarProps {
  bumpkin?: Bumpkin;
  showSkillPointAlert?: boolean;
  onClick?: () => void;
}

export const BumpkinAvatar: React.FC<AvatarProps> = ({
  bumpkin,
  showSkillPointAlert,
  onClick,
}) => {
  const progressBarEl = useRef<SpriteSheetInstance>();

  const experience = bumpkin?.experience ?? 0;
  const level = getBumpkinLevel(experience);

  useEffect(() => {
    goToProgress();
  }, [level, experience]);

  const goToProgress = () => {
    if (progressBarEl.current) {
      const experience = bumpkin?.experience ?? 0;
      const { currentExperienceProgress, experienceToNextLevel } =
        getExperienceToNextLevel(experience);

      let percent = currentExperienceProgress / experienceToNextLevel;
      // Progress bar cant go further than 100%
      if (isMaxLevel(experience)) {
        percent = 1;
      }

      const scaledToProgress = percent * (SPRITE_STEPS - 1);
      progressBarEl.current.goToAndPause(Math.floor(scaledToProgress));
    }
  };

  if (!bumpkin) return null;

  return (
    <>
      {/* Bumpkin profile */}
      <div
        className={classNames(`grid fixed -left-4 z-50 top-0`, {
          "cursor-pointer hover:img-highlight": !!onClick,
        })}
        style={{ height: "80px" }}
        onClick={onClick}
      >
        <img
          src={whiteBg}
          className="col-start-1 row-start-1 opacity-40"
          style={{
            width: `${DIMENSIONS.scaled}px`,
            height: `${DIMENSIONS.scaled}px`,
          }}
        />
        <div
          className="col-start-1 row-start-1 overflow-hidden z-0"
          style={{
            width: `${DIMENSIONS.bumpkinContainer.width}px`,
            height: `${DIMENSIONS.bumpkinContainer.height}px`,
            borderBottomLeftRadius: `${DIMENSIONS.bumpkinContainer.radiusBottomLeft}px`,
            borderBottomRightRadius: `${DIMENSIONS.bumpkinContainer.radiusBottomRight}px`,
          }}
        >
          {bumpkin && (
            <div
              style={{
                width: `${DIMENSIONS.bumpkin.width}px`,
                marginLeft: `${DIMENSIONS.bumpkin.marginLeft}px`,
              }}
            >
              <DynamicNFT
                key={JSON.stringify(bumpkin.equipped)}
                bumpkinParts={bumpkin.equipped}
                showTools={false}
              />
            </div>
          )}
        </div>
        <Spritesheet
          className="col-start-1 row-start-1 z-10"
          style={{
            width: `${DIMENSIONS.scaled}px`,
            imageRendering: "pixelated",
          }}
          image={progressBarSprite}
          widthFrame={DIMENSIONS.original}
          heightFrame={DIMENSIONS.original}
          zoomScale={new SpringValue(1)}
          fps={10}
          steps={SPRITE_STEPS}
          autoplay={false}
          getInstance={(spritesheet) => {
            progressBarEl.current = spritesheet;
            goToProgress();
          }}
        />
        <div
          className={`col-start-1 row-start-1 flex justify-center text-white text-xxs z-20`}
          style={{
            width: `${DIMENSIONS.level.width}px`,
            height: `${DIMENSIONS.level.height}px`,
            marginLeft: `${DIMENSIONS.level.marginLeft}px`,
            marginTop: `${DIMENSIONS.level.marginTop}px`,
          }}
        >
          {level}
        </div>
        {showSkillPointAlert && (
          <img
            src={SUNNYSIDE.icons.expression_alerted}
            className="col-start-1 row-start-1 animate-float z-30"
            style={{
              width: `${DIMENSIONS.skillsMark.width}px`,
              marginLeft: `${DIMENSIONS.skillsMark.marginLeft}px`,
              marginTop: `${DIMENSIONS.skillsMark.marginTop}px`,
            }}
          />
        )}
      </div>
    </>
  );
};

export const BumpkinProfile: React.FC<{
  isFullUser: boolean;
}> = ({ isFullUser }) => {
  const progressBarEl = useRef<SpriteSheetInstance>();
  const [viewSkillsPage, setViewSkillsPage] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { authService } = useContext(AuthProvider.Context);
  const [authState, send] = useActor(authService);

  const { gameService } = useContext(Context);
  const [gameState] = useActor(gameService);
  const {
    context: { state },
  } = gameState;

  const experience = state.bumpkin?.experience ?? 0;
  const level = getBumpkinLevel(experience);
  const showSkillPointAlert = hasUnacknowledgedSkillPoints(state.bumpkin);

  useEffect(() => {
    goToProgress();
  }, [level, experience]);

  const handleShowHomeModal = () => {
    setViewSkillsPage(showSkillPointAlert);
    setShowModal(true);
    if (showSkillPointAlert) {
      acknowledgeSkillPoints(state.bumpkin);
    }
  };

  const goToProgress = () => {
    if (progressBarEl.current) {
      const experience = state.bumpkin?.experience ?? 0;
      const { currentExperienceProgress, experienceToNextLevel } =
        getExperienceToNextLevel(experience);

      let percent = currentExperienceProgress / experienceToNextLevel;
      // Progress bar cant go further than 100%
      if (percent > 1) {
        percent = 1;
      }

      const scaledToProgress = percent * (SPRITE_STEPS - 1);
      progressBarEl.current.goToAndPause(Math.round(scaledToProgress));
    }
  };

  const handleHideModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Bumpkin modal */}
      <Modal show={showModal} centered onHide={handleHideModal}>
        <BumpkinModal
          initialView={viewSkillsPage ? "skills" : "home"}
          onClose={handleHideModal}
          readonly={gameState.matches("visiting")}
          bumpkin={gameState.context.state.bumpkin as Bumpkin}
          inventory={gameState.context.state.inventory}
          isFullUser={isFullUser}
        />
      </Modal>

      {/* Bumpkin profile */}
      <BumpkinAvatar
        bumpkin={state.bumpkin}
        onClick={handleShowHomeModal}
        showSkillPointAlert={
          showSkillPointAlert && !gameState.matches("visiting")
        }
      />
    </>
  );
};
