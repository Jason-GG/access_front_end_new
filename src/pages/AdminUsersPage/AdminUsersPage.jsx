import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteAdminUserApi,
  listAdminUsersApi,
  updateAdminUserRoleApi,
} from '../../api/adminApi'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import { cx, formatDateTime, normalizeUserRole } from '../../utils/helpers'
import styles from './AdminUsersPage.module.css'

const ROLE_FILTERS = [
  { key: 'all', label: 'All Members' },
  { key: 'admin', label: 'Admins' },
  { key: 'user', label: 'Users' },
]

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [pendingUserId, setPendingUserId] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const fetchUsers = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setErrorMessage(null)
    try {
      const res = await listAdminUsersApi({
        limit: 100,
        cursor: cursor || undefined,
      })
      const incoming = Array.isArray(res?.users)
        ? res.users.map((u) => ({
            ...u,
            role: normalizeUserRole(u.role),
            score: typeof u.score === 'number' ? u.score : 500,
          }))
        : []

      setUsers((prev) => {
        if (!append) return incoming
        const existingIds = new Set(prev.map((item) => item.id))
        const uniqueIncoming = incoming.filter((item) => !existingIds.has(item.id))
        return [...prev, ...uniqueIncoming]
      })
      setNextCursor(res?.nextCursor || null)
      if (res?.summary) {
        setSummary(res.summary)
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to load club members.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const stats = useMemo(() => {
    const totalUsers = summary?.totalUsers ?? users.length
    const adminCount =
      summary?.adminCount ?? users.filter((u) => normalizeUserRole(u.role) === 'admin').length
    const userCount = summary?.userCount ?? Math.max(0, totalUsers - adminCount)
    const verifiedCount =
      summary?.verifiedCount ?? users.filter((u) => Boolean(u.emailVerifiedAt)).length
    return { totalUsers, adminCount, userCount, verifiedCount }
  }, [summary, users])

  const filteredUsers = useMemo(() => {
    const query = searchInput.trim().toLowerCase()
    return users
      .filter((member) => {
        const normalized = normalizeUserRole(member.role)
        if (roleFilter === 'admin' && normalized !== 'admin') return false
        if (roleFilter === 'user' && normalized !== 'user') return false
        if (!query) return true
        const uname = String(member.username || '').toLowerCase()
        const mail = String(member.email || '').toLowerCase()
        const uid = String(member.id || '').toLowerCase()
        return uname.includes(query) || mail.includes(query) || uid.includes(query)
      })
      .sort((a, b) => {
        const aAdmin = normalizeUserRole(a.role) === 'admin' ? 0 : 1
        const bAdmin = normalizeUserRole(b.role) === 'admin' ? 0 : 1
        if (aAdmin !== bAdmin) return aAdmin - bAdmin
        return String(a.username || '').localeCompare(String(b.username || ''))
      })
  }, [users, roleFilter, searchInput])

  async function handleRoleChange(targetUser, nextRole) {
    if (!targetUser?.id) return
    const currentRole = normalizeUserRole(targetUser.role)
    if (currentRole === nextRole) return

    if (String(targetUser.id) === String(currentUser?.id) && nextRole !== 'admin') {
      setErrorMessage('You cannot remove your own admin role.')
      return
    }

    if (nextRole === 'user' && currentRole === 'admin') {
      const confirmed = window.confirm(
        `Remove admin privileges from "${targetUser.username}" and set their role back to "user"?`,
      )
      if (!confirmed) return
    }

    setPendingUserId(targetUser.id)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const res = await updateAdminUserRoleApi(targetUser.id, nextRole)
      const updatedRole = normalizeUserRole(res?.user?.role || nextRole)

      setUsers((prev) =>
        prev.map((item) =>
          item.id === targetUser.id
            ? {
                ...item,
                ...(res?.user || {}),
                role: updatedRole,
              }
            : item,
        ),
      )

      setSummary((prev) => {
        if (!prev) return prev
        const delta = updatedRole === 'admin' ? 1 : -1
        const nextAdminCount = Math.max(0, (prev.adminCount || 0) + delta)
        return {
          ...prev,
          adminCount: nextAdminCount,
          userCount: Math.max(0, (prev.totalUsers || 0) - nextAdminCount),
        }
      })

      setStatusMessage(
        updatedRole === 'admin'
          ? `Granted admin role to ${targetUser.username}.`
          : `Changed ${targetUser.username}'s role to user.`,
      )
    } catch (err) {
      setErrorMessage(err?.message || `Failed to update role for ${targetUser.username}.`)
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleDeleteUser(targetUser) {
    if (!targetUser?.id) return
    if (normalizeUserRole(targetUser.role) === 'admin') {
      setErrorMessage('Admin accounts cannot be deleted directly. Change their role to user first.')
      return
    }
    const confirmed = window.confirm(
      `Permanently delete user "${targetUser.username}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    setPendingUserId(targetUser.id)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      await deleteAdminUserApi(targetUser.id)
      setUsers((prev) => prev.filter((item) => item.id !== targetUser.id))
      setSummary((prev) => {
        if (!prev) return prev
        const nextTotal = Math.max(0, (prev.totalUsers || 1) - 1)
        const wasVerified = Boolean(targetUser.emailVerifiedAt)
        return {
          ...prev,
          totalUsers: nextTotal,
          userCount: Math.max(0, nextTotal - (prev.adminCount || 0)),
          verifiedCount: wasVerified
            ? Math.max(0, (prev.verifiedCount || 1) - 1)
            : prev.verifiedCount,
        }
      })
      setStatusMessage(`Deleted user "${targetUser.username}".`)
    } catch (err) {
      setErrorMessage(err?.message || `Failed to delete ${targetUser.username}.`)
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroBand}>
        <div className="container">
          <div className={styles.heroHeader}>
            <div className={styles.heroCopy}>
              <p className="eyebrow">Administration</p>
              <h1 className={styles.title}>Admin User Management</h1>
              <p className={styles.subtitle}>
                Restricted to administrators. Define which members hold the{' '}
                <strong>admin</strong> role — all accounts default to the{' '}
                <strong>user</strong> role.
              </p>
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total Members</span>
                <span className={styles.summaryValue}>{stats.totalUsers}</span>
              </div>
              <div className={cx(styles.summaryCard, styles.summaryCardTeal)}>
                <span className={styles.summaryLabel}>Admins</span>
                <span className={styles.summaryValue}>{stats.adminCount}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Users</span>
                <span className={styles.summaryValue}>{stats.userCount}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Verified</span>
                <span className={styles.summaryValue}>{stats.verifiedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band band--canvas">
        <div className="container">
          <div className={styles.card}>
            <div className={styles.toolbar}>
              <div className={styles.filterGroup} role="tablist" aria-label="Filter by role">
                {ROLE_FILTERS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={roleFilter === tab.key}
                    className={cx(
                      styles.filterPill,
                      roleFilter === tab.key && styles.filterPillActive,
                    )}
                    onClick={() => setRoleFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={styles.toolbarRight}>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search username, email, or ID…"
                  aria-label="Search users"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchUsers()}
                  disabled={loading}
                >
                  {loading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>
            </div>

            {statusMessage && (
              <div className={styles.successBanner} role="status">
                ✓ {statusMessage}
              </div>
            )}
            {errorMessage && (
              <div className={styles.errorBanner} role="alert">
                {errorMessage}
              </div>
            )}

            {loading ? (
              <div className={styles.emptyState}>Loading club members…</div>
            ) : filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                No members match your current filter.
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Email & Verification</th>
                      <th>Score</th>
                      <th>Joined</th>
                      <th>Role</th>
                      <th className={styles.actionsHeader}>Manage Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((member) => {
                      const role = normalizeUserRole(member.role)
                      const isTargetAdmin = role === 'admin'
                      const isSelf = String(member.id) === String(currentUser?.id)
                      const isBusy = pendingUserId === member.id
                      const initial =
                        String(member.username || 'U')
                          .trim()
                          .charAt(0)
                          .toUpperCase() || 'U'

                      return (
                        <tr
                          key={member.id}
                          className={cx(isTargetAdmin && styles.adminRow)}
                        >
                          <td>
                            <div className={styles.memberCell}>
                              <span
                                className={cx(
                                  styles.avatar,
                                  isTargetAdmin && styles.avatarAdmin,
                                )}
                                aria-hidden="true"
                              >
                                {initial}
                              </span>
                              <div className={styles.memberInfo}>
                                <div className={styles.memberNameRow}>
                                  <span className={styles.memberName}>
                                    {member.username}
                                  </span>
                                  {isSelf && <span className={styles.youTag}>You</span>}
                                </div>
                                <span className={styles.memberId}>{member.id}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className={styles.emailCell}>
                              <span className={styles.emailText}>
                                {member.email || '—'}
                              </span>
                              {member.emailVerifiedAt ? (
                                <span className={styles.verifiedPill}>✓ Verified</span>
                              ) : (
                                <span className={styles.unverifiedPill}>Unverified</span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className={styles.scoreBadge}>
                              ★ {typeof member.score === 'number' ? member.score : 500} pts
                            </span>
                          </td>

                          <td className={styles.dateCell}>
                            {member.createdAt ? formatDateTime(member.createdAt) : '—'}
                          </td>

                          <td>
                            <span
                              className={cx(
                                styles.roleBadge,
                                isTargetAdmin ? styles.roleAdmin : styles.roleUser,
                              )}
                            >
                              {role}
                            </span>
                          </td>

                          <td className={styles.actionsCell}>
                            <div className={styles.actionButtons}>
                              {isTargetAdmin ? (
                                isSelf ? (
                                  <span className={styles.selfProtectedNote}>
                                    Active Admin
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => handleRoleChange(member, 'user')}
                                  >
                                    {isBusy ? 'Updating…' : 'Set as User'}
                                  </Button>
                                )
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="teal"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => handleRoleChange(member, 'admin')}
                                  >
                                    {isBusy ? 'Updating…' : 'Make Admin'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => handleDeleteUser(member)}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {nextCursor && (
              <div className={styles.loadMoreRow}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => fetchUsers({ cursor: nextCursor, append: true })}
                >
                  {loadingMore ? 'Loading more…' : 'Load more members'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
