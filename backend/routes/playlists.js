import { Router } from "express";
import Playlist from "../models/Playlist.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import {
  isPlaylistOwner,
  isPlaylistOwnerOrShared,
} from "../middleware/ownership.js";

const router = Router();

router.get("/latest", async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: null })
      .sort({ _id: -1 })
      .limit(5)
      .populate("songs", "title");
    res.json(playlists);
  } catch (err) {
    console.error("Latest playlists failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Current user's own playlists.
 */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email");
    res.json(playlists);
  } catch (err) {
    console.error("My playlists failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * All playlists that have been shared with the currently logged-in user
 * (i.e. playlists where sharedWith contains req.user._id).
 * Read-only – the user cannot modify these playlists.
 */
router.get("/shared-with-me", requireAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ sharedWith: req.user._id })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email");
    res.json(playlists);
  } catch (err) {
    console.error("Shared-with-me playlists failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get a single playlist that belongs to the logged-in user OR is shared with them.
 * Must be placed before GET /:id so it is not swallowed by that catch-all.
 */
router.get(
  "/my/:id",
  requireAuth,
  isPlaylistOwnerOrShared,
  async (req, res) => {
    try {
      await req.playlist.populate([
        { path: "songs", populate: { path: "artist", select: "name" } },
        { path: "user", select: "email" },
      ]);
      res.json(req.playlist);
    } catch (err) {
      console.error("Get my playlist by id failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

/**
 * Share a playlist with another user, identified by their email address.
 * Only the owner may do this. Idempotent – sharing with the same user twice is safe.
 *
 * POST /api/playlists/my/:id/share
 * Body: { "email": "someone@example.com" }
 */
router.post("/my/:id/share", requireAuth, isPlaylistOwner, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    // Find the target user by email
    const targetUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ error: "No user with that email was found" });
    }

    // Prevent the owner from sharing with themselves
    if (targetUser._id.equals(req.user._id)) {
      return res
        .status(400)
        .json({ error: "You cannot share a playlist with yourself" });
    }

    // Idempotent: only push if not already present ($addToSet)
    const updated = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { sharedWith: targetUser._id } },
      { new: true },
    )
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email")
      .populate("sharedWith", "email");

    res.json({
      message: `Playlist shared with ${targetUser.email}`,
      playlist: updated,
    });
  } catch (err) {
    console.error("Share playlist failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all publicly accessible playlists (user is null).
 */
router.get("/", async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: null })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email");
    res.json(playlists);
  } catch (err) {
    console.error("Playlists list failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/my", requireAuth, async (req, res) => {
  try {
    const body = {
      name: req.body.name,
      description: req.body.description,
      songs: req.body.songs || [],
      user: req.body.user ?? req.user._id,
    };
    const playlist = await Playlist.create(body);
    await playlist.populate("songs", "title artist durationSeconds");
    await playlist.populate("user", "email");
    res.status(201).json(playlist);
  } catch (err) {
    console.error("Create playlist failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

router.put("/my/:id", requireAuth, isPlaylistOwner, async (req, res) => {
  try {
    // Prevent a shared user from ever reaching this route (isPlaylistOwner already
    // handles this, but being explicit is good for clarity).
    const playlist = await Playlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email");
    if (!playlist) {
      console.error("Update playlist: Playlist not found");
      return res.status(404).json({ error: "Playlist not found" });
    }
    res.json(playlist);
  } catch (err) {
    console.error("Update playlist failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

router.delete("/my/:id", requireAuth, isPlaylistOwner, async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndDelete(req.params.id);
    if (!playlist) {
      console.error("Delete playlist: Playlist not found");
      return res.status(404).json({ error: "Playlist not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete playlist failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Share a playlist with another user, identified by their email address.
 * Only the owner may do this. Idempotent – sharing with the same user twice is safe.
 *
 * POST /api/playlists/my/:id/share
 * Body: { "email": "someone@example.com" }
 */
router.post("/my/:id/share", requireAuth, isPlaylistOwner, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    // Find the target user by email
    const targetUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ error: "No user with that email was found" });
    }

    // Prevent the owner from sharing with themselves
    if (targetUser._id.equals(req.user._id)) {
      return res
        .status(400)
        .json({ error: "You cannot share a playlist with yourself" });
    }

    // Idempotent: only push if not already present ($addToSet)
    const updated = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { sharedWith: targetUser._id } },
      { new: true },
    )
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email")
      .populate("sharedWith", "email");

    res.json({
      message: `Playlist shared with ${targetUser.email}`,
      playlist: updated,
    });
  } catch (err) {
    console.error("Share playlist failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get a publicly accessible playlist by ID (user must be null on the document).
 * Must be registered after /my so /my is not interpreted as an id.
 */
router.get("/:id", async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      user: null,
    }).populate({
      path: "songs",
      populate: { path: "artist", select: "name" },
    });
    if (!playlist) {
      console.error("Playlist by ID: Playlist not found");
      return res.status(404).json({ error: "Playlist not found" });
    }
    res.json(playlist);
  } catch (err) {
    console.error("Playlist by ID failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
