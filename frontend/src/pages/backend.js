/*import express from "express";
import { Deepgram } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const dg = new Deepgram(process.env.DEEPGRAM_KEY);

router.get("/token", async (req, res) => {
  const token = await dg.createProjectToken({
    scopes: ["usage:write", "usage:read", "streams:write"],
  });

  res.json({ token: token.key });
});

export default router;
*/