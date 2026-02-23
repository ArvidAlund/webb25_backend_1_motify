import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import './PlaylistsTab.css'

function formatDuration(seconds) {
  if (!seconds) return '--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistsTab() {
  const { user, getAccessToken } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSongs, setSelectedSongs] = useState([])
  const [allSongs, setAllSongs] = useState([])
  const [songsLoading, setSongsLoading] = useState(false)
  const [addSongOpen, setAddSongOpen] = useState(false)
  const [songSearch, setSongSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) return
    const token = getAccessToken()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/playlists?user=${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to load playlists')
      const data = await res.json()
      setPlaylists(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, getAccessToken])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setSelectedSongs([])
    setFormError('')
    setAddSongOpen(false)
    setSongSearch('')
    setFormOpen(true)
  }

  const openEdit = async (p) => {
    setEditing(p)
    setName(p.name)
    setDescription(p.description || '')
    setFormError('')
    setAddSongOpen(false)
    setSongSearch('')
    setFormOpen(true)
    if (p.songs?.length) {
      setSelectedSongs(p.songs.map((s) => ({ _id: s._id, title: s.title, artist: s.artist, durationSeconds: s.durationSeconds })))
    } else {
      setSelectedSongs([])
    }
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setFormError('')
    setAddSongOpen(false)
  }

  useEffect(() => {
    if (formOpen && allSongs.length === 0) {
      setSongsLoading(true)
      fetch('/api/songs')
        .then((res) => res.json())
        .then((data) => setAllSongs(data))
        .finally(() => setSongsLoading(false))
    }
  }, [formOpen, allSongs.length])

  const addSong = (song) => {
    if (selectedSongs.some((s) => s._id === song._id)) return
    setSelectedSongs((prev) => [...prev, song])
    setAddSongOpen(false)
    setSongSearch('')
  }

  const removeSong = (songId) => {
    setSelectedSongs((prev) => prev.filter((s) => s._id !== songId))
  }

  const availableToAdd = allSongs.filter(
    (s) => !selectedSongs.some((sel) => sel._id === s._id) &&
      (!songSearch || s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
        (s.artist?.name || '').toLowerCase().includes(songSearch.toLowerCase()))
  ).slice(0, 10)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    const token = getAccessToken()
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        songs: selectedSongs.map((s) => s._id),
      }
      if (editing) {
        const res = await fetch(`/api/playlists/${editing._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Update failed')
        }
      } else {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Create failed')
        }
      }
      closeForm()
      fetchPlaylists()
    } catch (err) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (p) => {
    const token = getAccessToken()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/playlists/${p._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      setDeleteConfirm(null)
      fetchPlaylists()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="playlists-tab">
      <div className="playlists-tab-header">
        <div>
          <h2 className="section-title">My playlists</h2>
          <p className="section-subtitle">Create and manage your playlists</p>
        </div>
        <button type="button" className="playlists-create-btn" onClick={openCreate}>
          + New playlist
        </button>
      </div>

      {loading && <p className="playlists-loading">Loading...</p>}
      {error && <p className="playlists-error">{error}</p>}
      {formError && <p className="playlists-error">{formError}</p>}

      {!loading && !error && playlists.length === 0 && (
        <div className="playlists-empty">
          <p>No playlists yet. Create one to get started.</p>
        </div>
      )}

      {!loading && !error && playlists.length > 0 && (
        <div className="playlists-list">
          {playlists.map((p) => {
            const isExpanded = expandedId === p._id
            const songs = p.songs ?? []
            return (
              <div key={p._id} className={`playlist-row ${isExpanded ? 'playlist-row-expanded' : ''}`}>
                <div className="playlist-row-header">
                  <button
                    type="button"
                    className="playlist-row-expand"
                    onClick={() => toggleExpand(p._id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse playlist' : 'Expand playlist'}
                  >
                    <span className={`playlist-row-chevron ${isExpanded ? 'playlist-row-chevron-open' : ''}`}>›</span>
                  </button>
                  <button
                    type="button"
                    className="playlist-row-content playlist-row-content-btn"
                    onClick={() => toggleExpand(p._id)}
                  >
                    <h3 className="playlist-row-title">{p.name}</h3>
                    <p className="playlist-row-meta">
                      {songs.length} {songs.length === 1 ? 'song' : 'songs'}
                      {p.description && ` · ${p.description}`}
                    </p>
                  </button>
                  <div className="playlist-row-actions">
                    <button
                      type="button"
                      className="playlist-row-edit"
                      onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                      disabled={submitting}
                    >
                      Edit
                    </button>
                    {deleteConfirm?._id === p._id ? (
                      <>
                        <button
                          type="button"
                          className="playlist-row-delete-confirm"
                          onClick={() => handleDelete(p)}
                          disabled={submitting}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="playlist-row-cancel"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="playlist-row-delete"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p) }}
                        disabled={submitting}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="playlist-row-songs">
                    {songs.length === 0 ? (
                      <p className="playlist-row-songs-empty">No songs in this playlist</p>
                    ) : (
                      <ul className="playlist-expanded-list">
                        {songs.map((s, i) => (
                          <li key={s._id} className="playlist-expanded-item">
                            <span className="playlist-expanded-rank">{i + 1}</span>
                            <span className="playlist-expanded-title">{s.title}</span>
                            <span className="playlist-expanded-artist">{s.artist?.name ?? '—'}</span>
                            <span className="playlist-expanded-duration">{formatDuration(s.durationSeconds)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {formOpen && (
        <div className="playlist-form-overlay" onClick={closeForm} role="presentation">
          <div
            className="playlist-form-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="playlist-form-title">
              {editing ? 'Edit playlist' : 'New playlist'}
            </h3>
            <form onSubmit={handleSubmit} className="playlist-form">
              <label htmlFor="playlist-name" className="auth-label">
                Name
              </label>
              <input
                id="playlist-name"
                type="text"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Playlist name"
                required
              />
              <label htmlFor="playlist-desc" className="auth-label">
                Description (optional)
              </label>
              <input
                id="playlist-desc"
                type="text"
                className="auth-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this playlist about?"
              />

              <div className="playlist-songs-section">
                <label className="auth-label">Songs</label>
                {selectedSongs.length > 0 && (
                  <ul className="playlist-songs-list">
                    {selectedSongs.map((s, i) => (
                      <li key={s._id} className="playlist-songs-item">
                        <span className="playlist-songs-rank">{i + 1}</span>
                        <span className="playlist-songs-title">{s.title}</span>
                        <span className="playlist-songs-artist">{s.artist?.name ?? '—'}</span>
                        <span className="playlist-songs-duration">{formatDuration(s.durationSeconds)}</span>
                        <button
                          type="button"
                          className="playlist-songs-remove"
                          onClick={() => removeSong(s._id)}
                          aria-label={`Remove ${s.title}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="playlist-add-song">
                  {addSongOpen ? (
                    <div className="playlist-add-song-picker">
                      <input
                        type="text"
                        className="auth-input playlist-song-search"
                        placeholder="Search songs..."
                        value={songSearch}
                        onChange={(e) => setSongSearch(e.target.value)}
                        autoFocus
                      />
                      {songsLoading ? (
                        <p className="playlist-songs-loading">Loading songs...</p>
                      ) : availableToAdd.length === 0 ? (
                        <p className="playlist-songs-empty">
                          {selectedSongs.length >= allSongs.length
                            ? 'All songs added'
                            : songSearch ? 'No matches' : 'No songs in catalog'}
                        </p>
                      ) : (
                        <ul className="playlist-add-list">
                          {availableToAdd.map((s) => (
                            <li key={s._id}>
                              <button
                                type="button"
                                className="playlist-add-item"
                                onClick={() => addSong(s)}
                              >
                                <span className="playlist-add-title">{s.title}</span>
                                <span className="playlist-add-artist">{s.artist?.name ?? '—'}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        className="playlist-add-close"
                        onClick={() => { setAddSongOpen(false); setSongSearch('') }}
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="playlist-add-btn"
                      onClick={() => setAddSongOpen(true)}
                    >
                      + Add song
                    </button>
                  )}
                </div>
              </div>

              <div className="playlist-form-actions">
                <button
                  type="button"
                  className="playlist-form-cancel"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="auth-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
