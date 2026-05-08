"use client";

import { useEffect, useState } from "react";
import { getUsers, getPlans, grantSubscription, revokeSubscription } from "@/services/users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/custom/loader";
import useToast from "@/hooks/useToast";
import { Search, ChevronLeft, ChevronRight, Users, Crown, Gift, XCircle } from "lucide-react";

export default function MembersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [gForm, setGForm] = useState({ planId: "", endDate: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await getUsers(page, 20, search); if (r?.data) { setUsers(r.data.users || []); setTotal(r.data.total || 0); setTotalPages(r.data.totalPages || 1); } }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, [page, search]);
  useEffect(() => { getPlans().then(r => setPlans(r?.data || [])).catch(() => {}); }, []);
  const handleSearch = (e) => { e.preventDefault(); setPage(1); setSearch(searchInput); };
  const getSub = (u) => {
    if (!u.Subscriptions?.length) return { label: "Free", variant: "secondary", active: null };
    const a = u.Subscriptions.find(s => s.paymentStatus === "SUCCESS" && new Date(s.endDate) > new Date());
    if (a) return { label: "Premium", variant: "default", active: a };
    return { label: "Expired", variant: "destructive", active: null };
  };
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const doGrant = async () => {
    if (!gForm.planId || !gForm.endDate) { showError("Select plan and date"); return; }
    setSaving(true);
    try { await grantSubscription({ userId: selUser.id, planId: gForm.planId, endDate: gForm.endDate, notes: gForm.notes }); showSuccess("Subscription granted!"); setSelUser(null); setGForm({ planId: "", endDate: "", notes: "" }); fetchUsers(); }
    catch (e) { showError("Failed to grant"); } finally { setSaving(false); }
  };
  const doRevoke = async (sub, name) => {
    if (!confirm("Revoke subscription for " + name + "?")) return;
    try { await revokeSubscription(sub.id); showSuccess("Revoked"); fetchUsers(); } catch (e) { showError("Failed"); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><Users className="h-5 w-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold">Members</h1><p className="text-sm text-muted-foreground">{total} registered users</p></div>
      </div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search name or email..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" /></div>
        <Button type="submit">Search</Button>
        {search && <Button variant="outline" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>Clear</Button>}
      </form>
      {loading ? <Loader /> : users.length === 0 ? (
        <Card className="p-12 text-center"><Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">{search ? "No users found." : "No users yet."}</p></Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="bg-muted/50 border-b">{["#","Name","Email","Joined","Status","Actions"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>{users.map((u, i) => {
              const s = getSub(u);
              return (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{(page - 1) * 20 + i + 1}</td>
                  <td className="px-4 py-3"><span className="text-sm font-medium">{u.name || "\u2014"}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3"><Badge variant={s.variant} className="text-xs">{s.label === "Premium" && <Crown className="h-3 w-3 mr-1" />}{s.label}</Badge></td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => { setSelUser(u); setGForm({ planId: "", endDate: "", notes: "" }); }} className="p-1.5 rounded hover:bg-green-50" title="Grant Subscription"><Gift className="h-4 w-4 text-green-600" /></button>
                    {s.active && <button onClick={() => doRevoke(s.active, u.name || u.email)} className="p-1.5 rounded hover:bg-red-50" title="Revoke"><XCircle className="h-4 w-4 text-red-500" /></button>}
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table></div></div>
          {totalPages > 1 && <div className="flex items-center justify-between mt-4"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Prev</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button></div></div>}
        </>
      )}
      {selUser && (
        <Dialog open={true} onOpenChange={() => setSelUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Grant Subscription</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selUser.name || "No name"}</p>
                <p className="text-sm text-muted-foreground">{selUser.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Plan</label>
                <select className="w-full border rounded-md px-3 py-2 bg-background" value={gForm.planId} onChange={(e) => setGForm({ ...gForm, planId: e.target.value })}>
                  <option value="">Select Plan</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - Rs.{p.amount}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Access Until</label>
                <Input type="date" value={gForm.endDate} onChange={(e) => setGForm({ ...gForm, endDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                <Input value={gForm.notes} onChange={(e) => setGForm({ ...gForm, notes: e.target.value })} placeholder="e.g. Scholarship, Free trial" />
              </div>
              <div className="flex gap-2">
                <Button onClick={doGrant} disabled={saving} className="flex-1">{saving ? "Granting..." : "Grant Subscription"}</Button>
                <Button variant="outline" onClick={() => setSelUser(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}