import React, { useContext, useEffect, useRef, useState } from "react";
import classNames from "classnames";

import {
  ANIMAL_DIMENSIONS,
  COLLECTIBLES_DIMENSIONS,
  CollectibleName,
} from "features/game/types/craftables";

import { GRID_WIDTH_PX, PIXEL_SCALE } from "features/game/lib/constants";
import { Context } from "features/game/GameProvider";

import { Coordinates } from "features/game/expansion/components/MapPlacement";
import Draggable from "react-draggable";
import { detectCollision } from "features/game/expansion/placeable/lib/collisionDetection";
import { useSelector } from "@xstate/react";
import {
  MachineInterpreter,
  MachineState,
} from "features/game/expansion/placeable/landscapingMachine";
import {
  BUILDINGS_DIMENSIONS,
  BuildingName,
} from "features/game/types/buildings";
import { GameEventName, PlacementEvent } from "features/game/events";
import { RESOURCES, ResourceName } from "features/game/types/resources";
import { InventoryItemName } from "features/game/types/game";
import { removePlaceable } from "./lib/placing";
import { SUNNYSIDE } from "assets/sunnyside";
import { ITEM_DETAILS } from "features/game/types/images";
import { useIsMobile } from "lib/utils/hooks/useIsMobile";
import { ZoomContext } from "components/ZoomProvider";
import { InnerPanel } from "components/ui/Panel";
import { RemoveKuebikoModal } from "./RemoveKuebikoModal";
import { hasRemoveRestriction } from "features/game/types/removeables";

export const RESOURCE_MOVE_EVENTS: Record<
  ResourceName,
  GameEventName<PlacementEvent>
> = {
  Tree: "tree.moved",
  "Crop Plot": "crop.moved",
  "Fruit Patch": "fruitPatch.moved",
  "Gold Rock": "gold.moved",
  "Iron Rock": "iron.moved",
  "Stone Rock": "stone.moved",
  Boulder: "tree.moved",
};

function getMoveAction(name: InventoryItemName): GameEventName<PlacementEvent> {
  if (name in BUILDINGS_DIMENSIONS) {
    return "building.moved";
  }

  if (name in RESOURCES) {
    return RESOURCE_MOVE_EVENTS[name as ResourceName];
  }

  if (name in COLLECTIBLES_DIMENSIONS) {
    return "collectible.moved";
  }

  if (name === "Chicken") {
    return "chicken.moved";
  }

  throw new Error("No matching move event");
}

export function getRemoveAction(
  name: InventoryItemName
): GameEventName<PlacementEvent> | null {
  if (name in BUILDINGS_DIMENSIONS) {
    return "building.removed";
  }

  if (name in RESOURCES) {
    return null;
  }

  if (name === "Chicken") {
    return "chicken.removed";
  }

  if (name in COLLECTIBLES_DIMENSIONS) {
    return "collectible.removed";
  }

  return null;
}

export interface MovableProps {
  name: CollectibleName | BuildingName | "Chicken";
  id: string;
  x: number;
  y: number;
}

const getMovingItem = (state: MachineState) => state.context.moving;

export const MoveableComponent: React.FC<MovableProps> = ({
  name,
  id,
  x: coordinatesX,
  y: coordinatesY,
  children,
}) => {
  const { scale } = useContext(ZoomContext);

  const nodeRef = useRef(null);

  const [isMobile] = useIsMobile();
  const { gameService } = useContext(Context);
  const [isColliding, setIsColliding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [counts, setCounts] = useState(0);
  const isActive = useRef(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);

  const landscapingMachine = gameService.state.children
    .landscaping as MachineInterpreter;

  const movingItem = useSelector(landscapingMachine, getMovingItem);

  const isSelected = movingItem?.id === id && movingItem?.name === name;
  const removeAction = !isMobile && getRemoveAction(name);
  const hasRemovalAction = !!removeAction;
  const [isRestricted, restrictionReason] = hasRemoveRestriction(
    name,
    id,
    gameService.state.context.state
  );

  /**
   * Deselect if clicked outside of element
   */
  // https://stackoverflow.com/questions/32553158/detect-click-outside-react-component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isSelected &&
        (event as any).target.id === "genesisBlock" &&
        nodeRef.current &&
        !(nodeRef.current as any).contains(event.target)
      ) {
        landscapingMachine.send("BLUR");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [nodeRef, isSelected]);

  const remove = () => {
    if (!removeAction) {
      return;
    }

    if (showRemoveConfirmation) {
      landscapingMachine.send("REMOVE", {
        event: removeAction,
        id: id,
        name: name,
      });
    } else {
      setShowRemoveConfirmation(true);
    }
  };
  useEffect(() => {
    if (isActive.current && !isSelected) {
      // Reset
      setCounts((prev) => prev + 1);
      setIsColliding(false);
      setShowRemoveConfirmation(false);
      isActive.current = false;
    }
  }, [movingItem]);

  const dimensions = {
    ...BUILDINGS_DIMENSIONS,
    ...COLLECTIBLES_DIMENSIONS,
    ...ANIMAL_DIMENSIONS,
  }[name];

  const detect = ({ x, y }: Coordinates) => {
    const game = removePlaceable({
      state: gameService.state.context.state,
      id,
      name,
    });
    const collisionDetected = detectCollision(game, {
      x,
      y,
      width: dimensions.width,
      height: dimensions.height,
    });

    setIsColliding(collisionDetected);
    // send({ type: "UPDATE", coordinates: { x, y }, collisionDetected });
  };

  const origin = useRef<Coordinates>({ x: 0, y: 0 });

  return (
    <Draggable
      key={`${coordinatesX}-${coordinatesY}-${counts}`}
      nodeRef={nodeRef}
      grid={[GRID_WIDTH_PX * scale.get(), GRID_WIDTH_PX * scale.get()]}
      scale={scale.get()}
      allowAnyClick
      // Mobile must click first, before dragging
      disabled={isMobile && !isSelected}
      onMouseDown={() => {
        // Mobile must click first, before dragging

        if (isMobile && !isActive.current) {
          isActive.current = true;

          return;
        }

        landscapingMachine.send("MOVE", {
          name,
          id,
        });

        isActive.current = true;
      }}
      onStart={(_, data) => {
        const x = Math.round(data.x);
        const y = Math.round(-data.y);
        origin.current = { x, y };
      }}
      onDrag={(_, data) => {
        const xDiff = Math.round((origin.current.x + data.x) / GRID_WIDTH_PX);
        const yDiff = Math.round((origin.current.y - data.y) / GRID_WIDTH_PX);

        const x = coordinatesX + xDiff;
        const y = coordinatesY + yDiff;
        detect({ x, y });
        setIsDragging(true);
      }}
      onStop={(_, data) => {
        setIsDragging(false);

        const xDiff = Math.round((origin.current.x + data.x) / GRID_WIDTH_PX);
        const yDiff = Math.round((origin.current.y - data.y) / GRID_WIDTH_PX);

        const x = coordinatesX + xDiff;
        const y = coordinatesY + yDiff;

        const hasMoved = x !== coordinatesX || y !== coordinatesY;
        if (!hasMoved) {
          return;
        }

        const game = removePlaceable({
          state: gameService.state.context.state,
          id,
          name,
        });
        const collisionDetected = detectCollision(game, {
          x,
          y,
          width: dimensions.width,
          height: dimensions.height,
        });

        if (!collisionDetected) {
          gameService.send(getMoveAction(name), {
            // Don't send name for resource events
            ...(name in RESOURCE_MOVE_EVENTS ? {} : { name }),
            coordinates: {
              x: coordinatesX + xDiff,
              y: coordinatesY + yDiff,
            },
            id,
          });
        }
      }}
    >
      <div
        ref={nodeRef}
        data-prevent-drag-scroll
        className={classNames("h-full relative", {
          "cursor-grabbing": isDragging,
          "cursor-pointer": !isDragging,
          "z-10": isSelected,
        })}
      >
        {isSelected && (
          <div
            className="absolute z-10 flex"
            style={{
              right: `${PIXEL_SCALE * -(hasRemovalAction ? 34 : 12)}px`,
              top: `${PIXEL_SCALE * -12}px`,
            }}
          >
            <div
              className="relative mr-2"
              style={{
                width: `${PIXEL_SCALE * 18}px`,
              }}
            >
              <img className="w-full" src={SUNNYSIDE.icons.disc} />
              {isDragging ? (
                <img
                  className="absolute"
                  src={SUNNYSIDE.icons.dragging}
                  style={{
                    width: `${PIXEL_SCALE * 12}px`,
                    right: `${PIXEL_SCALE * 4}px`,
                    top: `${PIXEL_SCALE * 4}px`,
                  }}
                />
              ) : (
                <img
                  className="absolute"
                  src={SUNNYSIDE.icons.drag}
                  style={{
                    width: `${PIXEL_SCALE * 14}px`,
                    right: `${PIXEL_SCALE * 2}px`,
                    top: `${PIXEL_SCALE * 2}px`,
                  }}
                />
              )}
            </div>
            {showRemoveConfirmation && name === "Kuebiko" && (
              <RemoveKuebikoModal
                onClose={() => setShowRemoveConfirmation(false)}
                onRemove={() => remove()}
              />
            )}
            {hasRemovalAction && (
              <div
                className={classNames("group relative cursor-pointer", {
                  "cursor-not-allowed": isRestricted,
                })}
                style={{
                  width: `${PIXEL_SCALE * 18}px`,
                }}
                onClick={(e) => {
                  if (!isRestricted) remove();
                  e.preventDefault();
                }}
              >
                <img className="w-full" src={SUNNYSIDE.icons.disc} />
                {isSelected && showRemoveConfirmation ? (
                  <>
                    <img
                      className="absolute"
                      src={SUNNYSIDE.icons.confirm}
                      style={{
                        width: `${PIXEL_SCALE * 12}px`,
                        right: `${PIXEL_SCALE * 3}px`,
                        top: `${PIXEL_SCALE * 3}px`,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <img
                      className="absolute"
                      src={ITEM_DETAILS["Rusty Shovel"].image}
                      style={{
                        width: `${PIXEL_SCALE * 12}px`,
                        right: `${PIXEL_SCALE * 3}px`,
                        top: `${PIXEL_SCALE * 3}px`,
                      }}
                    />
                    {isRestricted && (
                      <img
                        src={SUNNYSIDE.icons.cancel}
                        className="absolute right-0 top-0 w-1/2 h-1/2 object-contain"
                        alt="restricted"
                      />
                    )}
                  </>
                )}
                {isRestricted && (
                  <div
                    className="flex justify-center absolute w-full pointer-events-none invisible group-hover:!visible"
                    style={{
                      top: `${PIXEL_SCALE * -10}px`,
                    }}
                  >
                    <InnerPanel className="absolute whitespace-nowrap w-fit z-50">
                      <div className="text-xxs mx-1 p-1">
                        <span>{restrictionReason}</span>
                      </div>
                    </InnerPanel>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div
          className={classNames("h-full pointer-events-none", {
            "bg-red-500 bg-opacity-75": isColliding,
            "bg-green-300 bg-opacity-50": !isColliding && isSelected,
          })}
        >
          {children}
        </div>
      </div>
    </Draggable>
  );
};
