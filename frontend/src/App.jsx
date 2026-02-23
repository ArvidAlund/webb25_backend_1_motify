import { useState, useEffect } from 'react'
import './App.css'
import TopSongListItem from './components/TopSongListItem'
import PlaylistCard from './components/PlaylistCard'
import AuthModal from './components/AuthModal'
import PlaylistsTab from './components/PlaylistsTab'
import { useAuth } from './context/AuthContext'

function App() {
  const { user, loading: authLoading, login, register, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('discover')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [songs, setSongs] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [playlistsLoading, setPlaylistsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playlistsError, setPlaylistsError] = useState(null)

  useEffect(() => {
    if (!user && activeTab === 'playlists') setActiveTab('discover')
  }, [user, activeTab])

  useEffect(() => {
    fetch('/api/songs/popular')
      .then((res) => res.json())
      .then((data) => setSongs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/playlists/latest')
      .then((res) => res.json())
      .then((data) => setPlaylists(data))
      .catch((err) => setPlaylistsError(err.message))
      .finally(() => setPlaylistsLoading(false))
  }, [])

  return (
    <div className="homepage">
      <header className="header">
        <h1 className="logo">Motify</h1>
        <nav className="nav">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'discover' ? 'nav-tab-active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            Discover
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'library' ? 'nav-tab-active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            Library
          </button>
          {user && (
            <button
              type="button"
              className={`nav-tab ${activeTab === 'playlists' ? 'nav-tab-active' : ''}`}
              onClick={() => setActiveTab('playlists')}
            >
              Playlists
            </button>
          )}
          {authLoading ? (
            <span className="nav-auth-loading">…</span>
          ) : user ? (
            <div className="nav-user">
              <span className="nav-user-email">{user.email}</span>
              <button
                type="button"
                className="nav-logout"
                onClick={logout}
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="nav-login"
              onClick={() => setAuthModalOpen(true)}
            >
              Log in
            </button>
          )}
        </nav>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={{ login, register }}
      />

      <main className="main">
        {activeTab === 'playlists' ? (
          <PlaylistsTab />
        ) : activeTab === 'library' ? (
          <section className="library-placeholder">
            <h2 className="section-title">Library</h2>
            <p className="section-subtitle">Your saved music and playlists</p>
            <p className="playlists-loading">Coming soon.</p>
          </section>
        ) : (
          <>
        <section className="hero">
          <p className="tagline">Music at your fingertips</p>
          <p className="subtitle">
            Discover artists, build playlists, and lose yourself in sound.
          </p>
          {!user && (
            <button
              className="cta"
              type="button"
              onClick={() => setAuthModalOpen(true)}
            >
              Get started
            </button>
          )}
        </section>

        <section className="top-songs">
          <div className="section-header">
            <h2 className="section-title">Top 10 songs</h2>
            <p className="section-subtitle">Most played this week</p>
          </div>
          {loading && <p className="songs-loading">Loading...</p>}
          {error && <p className="songs-error">{error}</p>}
          {!loading && !error && songs.length > 0 && (
            <div className="songs-card">
              <div className="songs-list-header">
                <span className="col-rank">#</span>
                <span className="col-info">Track</span>
                <span className="col-meta">Time</span>
                <span className="col-meta">Plays</span>
              </div>
              <ul className="songs-list">
                {songs.map((song, i) => (
                  <TopSongListItem key={song._id} song={song} rank={i + 1} />
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="latest-playlists">
          <div className="section-header">
            <h2 className="section-title">Latest playlists</h2>
            <p className="section-subtitle">Recently added</p>
          </div>
          {playlistsLoading && <p className="playlists-loading">Loading...</p>}
          {playlistsError && <p className="playlists-error">{playlistsError}</p>}
          {!playlistsLoading && !playlistsError && playlists.length > 0 && (
            <div className="playlists-row">
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist._id} playlist={playlist} />
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
