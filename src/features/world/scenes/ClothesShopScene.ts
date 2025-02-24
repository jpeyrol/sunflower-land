import clothesShopJson from "assets/map/clothe_shop.json";

import { RoomId } from "../roomMachine";
import { BaseScene, NPCBumpkin } from "./BaseScene";

const BUMPKINS: NPCBumpkin[] = [
  {
    x: 144,
    y: 134,
    npc: "stella",
  },
];

export class ClothesShopScene extends BaseScene {
  roomId: RoomId = "clothes_shop";

  constructor() {
    super({ name: "clothes_shop", map: { json: clothesShopJson } });
  }

  async create() {
    console.log("Create clothes shop");
    this.map = this.make.tilemap({
      key: "clothes-shop",
    });
    console.log("Created auction");

    super.create();

    this.initialiseNPCs(BUMPKINS);
  }
}
