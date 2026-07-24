'use client';

import { Plus, Edit, Check, X, Clock, Phone } from 'lucide-react';
import { useState } from 'react';

import { DashboardLayout } from '../../components/dashboard-layout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';
import { useCallbacks, useCreateCallback, useUpdateCallback, useCompleteCallback, useCancelCallback } from '../../lib/api/callbacks';

export default function CallbacksPage() {
  const { data: callbacksData, isLoading } = useCallbacks();
  const createCallback = useCreateCallback();
  const updateCallback = useUpdateCallback();
  const completeCallback = useCompleteCallback();
  const cancelCallback = useCancelCallback();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCallback, setEditingCallback] = useState<any>(null);
  const [formData, setFormData] = useState({
    leadId: '',
    campaignId: '',
    phoneNumber: '',
    scheduledFor: '',
    assignedTo: '',
    assignedTeamId: '',
    notes: '',
    priority: 0,
  });

  const callbacks = callbacksData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCallback.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        leadId: '',
        campaignId: '',
        phoneNumber: '',
        scheduledFor: '',
        assignedTo: '',
        assignedTeamId: '',
        notes: '',
        priority: 0,
      });
    } catch (error) {
      console.error('Failed to create callback:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCallback) return;
    try {
      await updateCallback.mutateAsync({ id: editingCallback.id, data: formData });
      setIsEditDialogOpen(false);
      setEditingCallback(null);
    } catch (error) {
      console.error('Failed to update callback:', error);
    }
  };

  const openEditDialog = (callback: any) => {
    setEditingCallback(callback);
    setFormData({
      leadId: callback.leadId,
      campaignId: callback.campaignId || '',
      phoneNumber: callback.phoneNumber || '',
      scheduledFor: callback.scheduledFor ? new Date(callback.scheduledFor).toISOString().slice(0, 16) : '',
      assignedTo: callback.assignedTo || '',
      assignedTeamId: callback.assignedTeamId || '',
      notes: callback.notes || '',
      priority: callback.priority,
    });
    setIsEditDialogOpen(true);
  };

  const handleComplete = async (id: string) => {
    try {
      await completeCallback.mutateAsync(id);
    } catch (error) {
      console.error('Failed to complete callback:', error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this callback?')) return;
    try {
      await cancelCallback.mutateAsync(id);
    } catch (error) {
      console.error('Failed to cancel callback:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: any; label: string }> = {
      pending: { variant: 'warning', icon: Clock, label: 'Pending' },
      completed: { variant: 'success', icon: Check, label: 'Completed' },
      cancelled: { variant: 'destructive', icon: X, label: 'Cancelled' },
      missed: { variant: 'destructive', icon: X, label: 'Missed' },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Callbacks</h1>
            <p className="mt-2 text-gray-600">Manage scheduled callbacks for leads</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Callback
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Callbacks</CardTitle>
            <CardDescription>{callbacks.length} callbacks total</CardDescription>
          </CardHeader>
          <CardContent>
            {callbacks.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No callbacks scheduled yet. Schedule your first callback to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callbacks.map((callback) => (
                    <TableRow key={callback.id}>
                      <TableCell className="font-mono text-sm">{callback.leadId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{callback.phoneNumber || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{new Date(callback.scheduledFor).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {callback.assignedTo ? (
                          <Badge variant="outline">Assigned</Badge>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{callback.priority}</TableCell>
                      <TableCell>{getStatusBadge(callback.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {callback.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleComplete(callback.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancel(callback.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(callback)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Schedule Callback</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="leadId">Lead ID</Label>
              <Input
                id="leadId"
                value={formData.leadId}
                onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number (optional)</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="scheduledFor">Scheduled For</Label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedTo">Assigned To (User ID)</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Edit Callback</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-scheduledFor">Scheduled For</Label>
              <Input
                id="edit-scheduledFor"
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-assignedTo">Assigned To (User ID)</Label>
                <Input
                  id="edit-assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
