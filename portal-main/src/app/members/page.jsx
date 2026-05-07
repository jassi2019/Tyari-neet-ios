"use client";

import { useEffect, useState } from "react";
import { getUsers, getPlans, grantSubscription, revokeSubscription } from "@/services/users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Loader from "@/components/custom/loader";
import useToast from "@/hooks/useToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Users, Mail, Calendar, Crown, Gift, Eye } from "lucide-react";

export default function MembersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [grantForm, setGrantForm] = useState({ planId: "", endDate: "", notes: "" });
  const [granting, setGranting] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers(page, 20, search);
      if (result?.data) {
        setUsers(result.data.users || []);
        setTotal(result.data.total || 0);
        setTotalPages(result.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); setSearch(searchInput); };

  const getSubscriptionStatus = (user) => {
    if (!user.Subscriptions || user.Subscriptions.length === 0) return { label: "Free", variant: "secondary" };
    const active = user.Subscriptions.find((s) => s.paymentStatus === "SUCCESS" && new Date(s.endDate) > new Date());
    if (active) return { label: "Premium", variant: "default" };
    return { label: "Expired", variant: "destructive" };
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <p className="text-sm text-muted-foreground">{total} registered {total === 1 ? "user" : "users"}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" />
        </div>
        <Button type="submit">Search</Button>
        {search && (<Button variant="outline" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>Clear</Button>)}
      </form>

      {loading ? (<Loader />) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{search ? "No users found matching your search." : "No users registered yet."}</p>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Joined</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const sub = getSubscriptionStatus(user);
                    return (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{(page - 1) * 20 + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(user.name || "?")[0].toUpperCase()}</div>
                            <span className="text-sm font-medium text-foreground">{user.name || "\u2014"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{user.email}</div></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{formatDate(user.createdAt)}</div></td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{user.registrationSource || "APP"}</Badge></td>
                        <td className="px-4 py-3"><Badge variant={sub.variant} className="text-xs">{sub.label === "Premium" && <Crown className="h-3 w-3 mr-1" />}{sub.label}</Badge></td>
                        <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => { setSelectedUser(user); setGrantForm({ planId: "", endDate: "", notes: "" }); }} className="p-1.5 rounded hover:bg-green-50" title="Grant Subscription"><Gift className="h-3.5 w-3.5 text-green-600" /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Grant Subscription</DialogTitle></DialogHeader>{selectedUser && <div className="space-y-4"><div className="p-3 bg-muted/50 rounded-lg"><p className="font-medium">{selectedUser.name || "No name"}</p><p className="text-sm text-muted-foreground">{selectedUser.email}</p></div><div><label className="text-sm font-medium mb-1 block">Plan</label><select className="w-full border rounded-md px-3 py-2 bg-background" value={grantForm.planId} onChange={(e) => setGrantForm({...grantForm, planId: e.target.value})}><option value="">Select Plan</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} - Rs.{p.amount}</option>)}</select></div><div><label className="text-sm font-medium mb-1 block">Access Until</label><Input type="date" value={grantForm.endDate} onChange={(e) => setGrantForm({...grantForm, endDate: e.target.value})} /></div><div><label className="text-sm font-medium mb-1 block">Notes</label><Input value={grantForm.notes} onChange={(e) => setGrantForm({...grantForm, notes: e.target.value})} placeholder="e.g. Scholarship, Trial..." /></div><div className="flex gap-2"><Button onClick={handleGrant} disabled={granting} className="flex-1">{granting ? "Granting..." : "Grant Subscription"}</Button><Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button></div></div>}</DialogContent></Dialog>
  );
}
