'use client';

import { Plus, Edit, Trash2, FileSpreadsheet } from 'lucide-react';
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
import { useLeadLists, useCreateLeadList, useUpdateLeadList, useDeleteLeadList } from '../../lib/api/lead-lists';

export default function LeadListsPage() {
  const { data: leadListsData, isLoading } = useLeadLists();
  const createLeadList = useCreateLeadList();
  const updateLeadList = useUpdateLeadList();
  const deleteLeadList = useDeleteLeadList();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLeadList, setEditingLeadList] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const leadLists = leadListsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLeadList.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to create lead list:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeadList) return;
    try {
      await updateLeadList.mutateAsync({ id: editingLeadList.id, data: formData });
      setIsEditDialogOpen(false);
      setEditingLeadList(null);
    } catch (error) {
      console.error('Failed to update lead list:', error);
    }
  };

  const openEditDialog = (leadList: any) => {
    setEditingLeadList(leadList);
    setFormData({
      name: leadList.name,
      description: leadList.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead list?')) return;
    try {
      await deleteLeadList.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete lead list:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; label: string }> = {
      active: { variant: 'success', label: 'Active' },
      archived: { variant: 'secondary', label: 'Archived' },
      deleted: { variant: 'destructive', label: 'Deleted' },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
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
            <h1 className="text-3xl font-bold text-gray-900">Lead Lists</h1>
            <p className="mt-2 text-gray-600">Manage your lead lists and import CSV files</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Lead List
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Lead Lists</CardTitle>
            <CardDescription>{leadLists.length} lead lists total</CardDescription>
          </CardHeader>
          <CardContent>
            {leadLists.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No lead lists yet. Create your first lead list to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Successful</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadLists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{list.name}</p>
                          <p className="text-sm text-gray-500">{list.description || 'No description'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(list.status)}</TableCell>
                      <TableCell>{list.totalRows}</TableCell>
                      <TableCell>{list.processedRows}</TableCell>
                      <TableCell>{list.successfulRows}</TableCell>
                      <TableCell>{list.failedRows}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(list)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(list.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
          <DialogTitle>Create Lead List</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Edit Lead List</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
