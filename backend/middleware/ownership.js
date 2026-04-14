import Playlist from "../models/Playlist.js";

export const isPlaylistOwner = async (req, res, next) => {
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist) {
    console.error("Ownership: Playlist not found");
    return res.status(404).json({ error: "Playlist not found" });
  }
  if (!playlist.user || !playlist.user.equals(req.user._id)) {
    console.error("Ownership: Not authorized to modify this playlist");
    return res
      .status(403)
      .json({ error: "Not authorized to modify this playlist" });
  }
  req.playlist = playlist;
  next();
};

/**
 * Middleware: allows access if the user is either the owner OR is in sharedWith.
 * - Owners get full access.
 * - Shared users get read-only access; req.isSharedUser = true is set so route
 *   handlers can enforce the read-only restriction if needed.
 * Attaches req.playlist on success.
 */
export const isPlaylistOwnerOrShared = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    const userId = req.user._id;
    const isOwner = playlist.user && playlist.user.equals(userId);
    const isShared = playlist.sharedWith.some((id) => id.equals(userId));

    if (!isOwner && !isShared) {
      return res
        .status(403)
        .json({ error: "Not authorized to access this playlist" });
    }

    req.playlist = playlist;
    req.isSharedUser = !isOwner; // true when the user is only a shared viewer
    next();
  } catch (err) {
    console.error("isPlaylistOwnerOrShared error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
