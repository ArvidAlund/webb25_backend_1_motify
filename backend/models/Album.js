import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema({
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  releaseDate: {
    type: Date,
    required: true,
  },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

albumSchema.index({ artist: 1, title: 1 }, { unique: true });

export default mongoose.model('Album', albumSchema);
