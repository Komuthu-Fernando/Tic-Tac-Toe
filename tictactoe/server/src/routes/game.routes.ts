import { Router } from "express";
import { getAllGames } from "../controllers/game.controller";

const router = Router();
router.get("/", getAllGames);

export default router;
