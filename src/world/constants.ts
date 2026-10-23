import { rect } from "./builder";

/** World units are metres. +X = east, +Z = south (towards the default camera). */
export const LAND = rect(-64, -48, 64, 44);
export const WATER_Y = -0.55;
export const LAND_THICKNESS = 2.2;

export const HQ = rect(-15, -17, 15, 5);
export const HQ_FLOOR_HEIGHT = 4.2;
export const HQ_L1_Y = 4.2;
export const HQ_ROOF_Y = 8.4;

export const MKT = rect(-54, -12, -30, 6);
export const SALES = rect(30, -14, 54, 4);
export const PAVILION_UPPER_Y = 3.8;

export const POOL_DECK = rect(-40, -45, -12, -25);
export const POOL_WATER = rect(-34, -40, -18, -31);
export const PLAZA = rect(-12, 9, 20, 26);
export const FOUNTAIN = { x: 4, z: 17.5, r: 4.4 };
export const AVENUE = rect(1, 26, 7, 40);
export const QUAY = rect(-64, 40, 64, 44);
export const PARKING = rect(14, 24, 50, 38);
export const PIER = rect(-40, 43.6, -34, 55);
export const GARDEN = rect(24, -44, 52, -24);

export const ELEVATOR_STOP = { x: 0, z: -11.3 };
export const MKT_STAIRS = rect(-33.7, -11.8, -30.3, -7.6);
export const MKT_STAIR_STOP = { x: -32, z: -6.7 };
export const SALES_STAIRS = rect(30.3, -13.8, 33.7, -9.6);
export const SALES_STAIR_STOP = { x: 32, z: -8.7 };
