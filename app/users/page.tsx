"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Badge,
  ErrorBox,
  EmptyBox,
  Field,
  LoadingBox,
  Modal,
  PageHeader,
  SuccessBox,
  Td,
  Th,
  TableShell,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  formatDateTime,
  inputCls,
  selectCls,
  statusTone,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  UserLogin,
  UserLoginStatus,
  UserRoleInfo,
  createUserLogin,
  deleteUserLogin,
  getUserRoles,
  listUserLogins,
  updateUserLogin,
  verifyUserLogin,
} from "@/lib/api/staff";

type SortBy = "username" | "user_id" | "user_role" | "status" | "created_date";

const emptyFilters = {
  username: "",
  staff_code: "",
  includeInactive: false,
};

const emptyCreateForm = {
  username: "",
  password: "",
  staff_code: "",
  user_role: "superuser",
};

const emptyEditForm = {
  username: "",
  password: "",
  user_role: "superuser",
  status: "active" as UserLoginStatus,
};

const emptyVerifyForm = { username: "", password: "" };

export default function UsersPage() {
  const [users, setUsers] = useState<UserLogin[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("created_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [roles, setRoles] = useState<UserRoleInfo[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<UserLogin | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserLogin | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState(emptyVerifyForm);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(
    async (
      f: typeof emptyFilters,
      sBy: SortBy,
      sOrder: "asc" | "desc"
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listUserLogins({
          username: f.username || undefined,
          staff_code: f.staff_code || undefined,
          include_inactive: f.includeInactive || undefined,
          sort_by: sBy,
          sort_order: sOrder,
        });
        setUsers(res.data);
        setTotalFound(res.total_found);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลผู้ใช้ได้"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(emptyFilters, "created_date", "desc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserRoles();
         
        setRoles(Array.isArray(res.data) ? res.data : []);
      } catch {
        // role list is a convenience for the select; ignore failures
      }
    })();
  }, []);

  function handleSearch() {
    void load(filters, sortBy, sortOrder);
  }

  function handleClear() {
    setFilters(emptyFilters);
    setSortBy("created_date");
    setSortOrder("desc");
    void load(emptyFilters, "created_date", "desc");
  }

  function handleSort(column: SortBy) {
    const nextOrder: "asc" | "desc" =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(nextOrder);
    void load(filters, column, nextOrder);
  }

  function openCreate() {
    setCreateForm(emptyCreateForm);
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.username || !createForm.password || !createForm.staff_code) {
      setCreateError("กรุณาระบุชื่อผู้ใช้ รหัสผ่าน และรหัสพนักงาน");
      return;
    }
    setCreating(true);
    try {
      await createUserLogin({
        username: createForm.username,
        password: createForm.password,
        staff_code: createForm.staff_code,
        user_role: "superuser",
      });
      setCreateOpen(false);
      void load(filters, sortBy, sortOrder);
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "ไม่สามารถเพิ่มผู้ใช้ได้"
      );
    } finally {
      setCreating(false);
    }
  }

  function openEdit(user: UserLogin) {
    setEditTarget(user);
    setEditForm({
      username: user.username ?? "",
      password: "",
      user_role: "superuser",
      status: (user.status as UserLoginStatus) ?? "active",
    });
    setEditError(null);
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);
    setEditing(true);
    try {
      await updateUserLogin(editTarget.user_id, {
        username: editForm.username || undefined,
        password: editForm.password || undefined,
        user_role: "superuser",
        status: editForm.status || undefined,
      });
      setEditTarget(null);
      void load(filters, sortBy, sortOrder);
    } catch (err) {
      setEditError(
        err instanceof ApiError ? err.message : "ไม่สามารถบันทึกข้อมูลได้"
      );
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteUserLogin(deleteTarget.user_id);
      setDeleteTarget(null);
      void load(filters, sortBy, sortOrder);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "ไม่สามารถลบผู้ใช้ได้"
      );
    } finally {
      setDeleting(false);
    }
  }

  function openVerify() {
    setVerifyForm(emptyVerifyForm);
    setVerifyResult(null);
    setVerifyError(null);
    setVerifyOpen(true);
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVerifyResult(null);
    setVerifyError(null);
    setVerifying(true);
    try {
      const res = await verifyUserLogin({
        username: verifyForm.username,
        password: verifyForm.password,
      });
      setVerifyResult(`รหัสผ่านถูกต้อง (${res.data.username})`);
    } catch (err) {
      setVerifyError(
        err instanceof ApiError ? err.message : "ไม่สามารถตรวจสอบรหัสผ่านได้"
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="ผู้ใช้งานระบบ"
        subtitle="บัญชี login ที่ผูกกับบุคลากร"
        actions={
          <div className="flex gap-2">
            <button onClick={openVerify} className={btnSecondaryCls}>
              ทดสอบรหัสผ่าน
            </button>
            <button onClick={openCreate} className={btnPrimaryCls}>
              เพิ่มผู้ใช้
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="ชื่อผู้ใช้">
            <input
              type="text"
              value={filters.username}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, username: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="รหัสพนักงาน">
            <input
              type="text"
              value={filters.staff_code}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, staff_code: e.target.value }))
              }
              className={inputCls}
              placeholder="ST-0001"
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={filters.includeInactive}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  includeInactive: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            รวมที่ถูกระงับ
          </label>
          <div className="flex items-end gap-2">
            <button onClick={handleSearch} className={`flex-1 ${btnPrimaryCls}`}>
              ค้นหา
            </button>
            <button onClick={handleClear} className={`flex-1 ${btnSecondaryCls}`}>
              ล้าง
            </button>
          </div>
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-500">
        พบ {totalFound.toLocaleString("th-TH")} รายการ
      </p>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <ErrorBox message={error} />
      ) : users.length === 0 ? (
        <EmptyBox text="ไม่พบข้อมูลผู้ใช้" />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th
                onClick={() => handleSort("username")}
                active={sortBy === "username"}
                dir={sortOrder}
              >
                ชื่อผู้ใช้
              </Th>
              <Th>รหัสพนักงาน</Th>
              <Th
                onClick={() => handleSort("user_role")}
                active={sortBy === "user_role"}
                dir={sortOrder}
              >
                Role
              </Th>
              <Th
                onClick={() => handleSort("status")}
                active={sortBy === "status"}
                dir={sortOrder}
              >
                สถานะ
              </Th>
              <Th>เข้าใช้ล่าสุด</Th>
              <Th
                onClick={() => handleSort("created_date")}
                active={sortBy === "created_date"}
                dir={sortOrder}
              >
                วันที่สร้าง
              </Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.user_id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-800">{u.username}</Td>
                <Td>{u.staff_code}</Td>
                <Td>{u.user_role}</Td>
                <Td>
                  <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                </Td>
                <Td className="text-slate-500">
                  {formatDateTime(u.last_login)}
                </Td>
                <Td className="text-slate-500">
                  {formatDateTime(u.created_date)}
                </Td>
                <Td>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEdit(u)}
                      className="font-medium text-teal-600 hover:text-teal-700"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(u);
                        setDeleteError(null);
                      }}
                      className="font-medium text-red-600 hover:text-red-700"
                    >
                      ลบ
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        title="เพิ่มผู้ใช้"
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="ชื่อผู้ใช้" required hint="4-50 ตัวอักษร">
            <input
              type="text"
              value={createForm.username}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className={inputCls}
              minLength={4}
              maxLength={50}
            />
          </Field>
          <Field label="รหัสผ่าน" required hint="อย่างน้อย 8 ตัวอักษร">
            <input
              type="password"
              value={createForm.password}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className={inputCls}
              minLength={8}
              maxLength={128}
            />
          </Field>
          <Field
            label="รหัสพนักงาน (staff_code)"
            required
            hint="ต้องเป็น staff ที่ active และยังไม่มี user"
          >
            <input
              type="text"
              value={createForm.staff_code}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  staff_code: e.target.value,
                }))
              }
              className={inputCls}
              placeholder="ST-0001"
            />
          </Field>
          <Field label="Role">
            <select
              value={createForm.user_role}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  user_role: e.target.value,
                }))
              }
              className={selectCls}
            >
              {(roles.length > 0
                ? roles.map((r) => r.user_role)
                : ["superuser"]
              ).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>

          {createError && <ErrorBox message={createError} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              className={btnSecondaryCls}
            >
              ยกเลิก
            </button>
            <button type="submit" disabled={creating} className={btnPrimaryCls}>
              {creating ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editTarget !== null}
        title={`แก้ไขผู้ใช้ ${editTarget?.username ?? ""}`}
        onClose={() => {
          if (!editing) setEditTarget(null);
        }}
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Field label="ชื่อผู้ใช้" hint="4-50 ตัวอักษร">
            <input
              type="text"
              value={editForm.username}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className={inputCls}
              minLength={4}
              maxLength={50}
            />
          </Field>
          <Field label="รหัสผ่านใหม่" hint="เว้นว่างถ้าไม่ต้องการเปลี่ยน">
            <input
              type="password"
              value={editForm.password}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className={inputCls}
              minLength={8}
              maxLength={128}
            />
          </Field>
          <Field label="สถานะ">
            <select
              value={editForm.status}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  status: e.target.value as UserLoginStatus,
                }))
              }
              className={selectCls}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </Field>

          {editError && <ErrorBox message={editError} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              disabled={editing}
              className={btnSecondaryCls}
            >
              ยกเลิก
            </button>
            <button type="submit" disabled={editing} className={btnPrimaryCls}>
              {editing ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteTarget !== null}
        title="ยืนยันการลบผู้ใช้"
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        <p className="mb-4 text-sm text-slate-600">
          ต้องการระงับผู้ใช้ {deleteTarget?.username} ใช่หรือไม่?
          (ระบบจะตั้งสถานะเป็น inactive — เปิดกลับมาใช้งานได้ในภายหลัง)
        </p>
        {deleteError && (
          <div className="mb-4">
            <ErrorBox message={deleteError} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            className={btnSecondaryCls}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={btnDangerCls}
          >
            {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
          </button>
        </div>
      </Modal>

      {/* Verify password modal */}
      <Modal
        open={verifyOpen}
        title="ทดสอบรหัสผ่าน"
        onClose={() => {
          if (!verifying) setVerifyOpen(false);
        }}
      >
        <form onSubmit={handleVerify} className="space-y-4">
          <Field label="ชื่อผู้ใช้" required>
            <input
              type="text"
              value={verifyForm.username}
              onChange={(e) =>
                setVerifyForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className={inputCls}
            />
          </Field>
          <Field label="รหัสผ่าน" required>
            <input
              type="password"
              value={verifyForm.password}
              onChange={(e) =>
                setVerifyForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className={inputCls}
            />
          </Field>

          {verifyResult && <SuccessBox>{verifyResult}</SuccessBox>}
          {verifyError && <ErrorBox message={verifyError} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setVerifyOpen(false)}
              disabled={verifying}
              className={btnSecondaryCls}
            >
              ปิด
            </button>
            <button type="submit" disabled={verifying} className={btnPrimaryCls}>
              {verifying ? "กำลังตรวจสอบ..." : "ตรวจสอบ"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
