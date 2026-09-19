import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import {
  Shield, UserX, Search, Crown, User as UserIcon, Mail, Calendar, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, user: null });
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated successfully");
      setConfirmDialog({ open: false, action: null, user: null });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user role");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
      setConfirmDialog({ open: false, action: null, user: null });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const handleRoleChange = (user, newRole) => {
    const adminCount = users.filter(u => u.role === 'admin').length;

    if (user.id === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    if (newRole === 'admin' && adminCount >= 3) {
      toast.error("Maximum of 3 admins allowed");
      return;
    }

    setConfirmDialog({
      open: true,
      action: 'role',
      user,
      newRole,
      title: newRole === 'admin' ? 'Promote to Admin?' : 'Demote to User?',
      description: newRole === 'admin'
        ? `Are you sure you want to promote ${user.email} to admin? They will have full access to manage users and content.`
        : `Are you sure you want to demote ${user.email} to regular user? They will lose admin privileges.`
    });
  };

  const handleDeleteUser = (user) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }

    setConfirmDialog({
      open: true,
      action: 'delete',
      user,
      title: 'Delete User Account?',
      description: `Are you sure you want to permanently delete ${user.email}? This action cannot be undone. All their listings and data will be removed.`
    });
  };

  const executeAction = () => {
    if (confirmDialog.action === 'role') {
      updateRoleMutation.mutate({
        userId: confirmDialog.user.id,
        newRole: confirmDialog.newRole,
      });
    } else if (confirmDialog.action === 'delete') {
      deleteUserMutation.mutate(confirmDialog.user.id);
    }
  };

  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const adminCount = users.filter(u => u.role === 'admin').length;
  const userCount = users.filter(u => u.role === 'user').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{users.length}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{adminCount}</p>
              <p className="text-xs text-gray-500">Admins (max 3)</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{userCount}</p>
              <p className="text-xs text-gray-500">Regular Users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="p-4">
                      <Skeleton className="h-8" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px] flex items-center gap-1 w-fit">
                          <Crown className="w-3 h-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 text-[10px] flex items-center gap-1 w-fit">
                          <UserIcon className="w-3 h-3" />
                          User
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {user.created_date ? format(new Date(user.created_date), "MMM d, yyyy") : "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {user.id !== currentUser?.id && (
                          <>
                            {user.role === 'admin' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-gray-600 text-xs"
                                onClick={() => handleRoleChange(user, 'user')}
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Demote
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-amber-600 text-xs"
                                onClick={() => handleRoleChange(user, 'admin')}
                                disabled={adminCount >= 3}
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                Promote
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-red-600 text-xs"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-gray-400 px-2">(You)</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={confirmDialog.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
