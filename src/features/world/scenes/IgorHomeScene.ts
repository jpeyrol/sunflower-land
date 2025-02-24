import igorHomeJSON from "assets/map/blacksmith_home.json";

import { RoomId } from "../roomMachine";
import { BaseScene, NPCBumpkin } from "./BaseScene";

const BUMPKINS: NPCBumpkin[] = [];

export class IgorHomeScene extends BaseScene {
  roomId: RoomId = "igor_home";

  constructor() {
    super({ name: "igor_home", map: { json: igorHomeJSON } });
  }

  async create() {
    console.log("Create igor_home shop");
    this.map = this.make.tilemap({
      key: "igor-home",
    });

    super.create();

    this.initialiseNPCs(BUMPKINS);
  }
}
