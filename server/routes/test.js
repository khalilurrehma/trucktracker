import express from "express";
import axios from "axios";
const router = express.Router();

const url = "https://flespi.io/gw";

router.get("/test/calcs/:calcsId/devices/:devicesId", (req, res) => {
  const { calcsId, devicesId } = req.params;

  axios
    .get(
      `https://flespi.io/gw/calcs/${calcsId}/devices/${devicesId}/intervals/all`,
      {
        headers: {
          Authorization: `FlespiToken DO3Z45affw3w5gOo04nP66scC73W5yIwbzl3tl7wGYQB4uOSn1xjVNllJc8EzE1A`,
        },
      }
    )
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
});

export default router;
