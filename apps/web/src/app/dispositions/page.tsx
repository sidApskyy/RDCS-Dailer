'use client';

import { Plus, Edit, Trash2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

import { DashboardLayout } from '../../components/dashboard-layout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';
import { useDispositions, useCreateDisposition, useUpdateDisposition, useDeleteDisposition } from '../../lib/api/dispositions';

export default function DispositionsPage() {
  const { data: dispositionsData, isLoading } = useDispositions();
  const createDisposition = useCreateDisposition();
  const updateDisposition = useUpdateDisposition();
  const deleteDisposition = useDeleteDisposition();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDisposition, setEditingDisposition] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'neutral',
    outcome: 'non_terminal',
    retryBehavior: '',
    callbackEligible: false,
    dncBehavior: '',
    description: '',
    isActive: true,
  });

  const dispositions = dispositionsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDisposition.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        code: '',
        name: '',
        category: 'neutral',
        outcome: 'non_terminal',
        retryBehavior: '',
        callbackEligible: false,
        dncBehavior: '',
        description: '',
        isActive: true,
      });
    } catch (error) {
      console.error('Failed to create disposition:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisposition) return;
    try {
      await updateDisposition.mutateAsync({ id: editingDisposition.id, data: formData });
      setIsEditDialogOpen(false);
      setEditingDisposition(null);
    } catch (error) {
      console.error('Failed to update disposition:', error);
    }
  };

  const openEditDialog = (disposition: any) => {
    setEditingDisposition(disposition);
    setFormData({
      code: disposition.code,
      name: disposition.name,
      category: disposition.category,
      outcome: disposition.outcome,
      retryBehavior: disposition.retryBehavior || '',
      callbackEligible: disposition.callbackEligible,
      dncBehavior: disposition.dncBehavior || '',
      description: disposition.description || '',
      isActive: disposition.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disposition?')) return;
    try {
      await deleteDisposition.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete disposition:', error);
    }
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { variant: string; label: string }> = {
      positive: { variant: 'success', label: 'Positive' },
      negative: { variant: 'destructive', label: 'Negative' },
      neutral: { variant: 'secondary', label: 'Neutral' },
      callback: { variant: 'warning', label: 'Callback' },
      dnc: { variant: 'destructive', label: 'DNC' },
    };
    const config = variants[category] || variants.neutral;
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
            <h1 className="text-3xl font-bold text-gray-900">Dispositions</h1>
            <p className="mt-2 text-gray-600">Manage call dispositions and outcomes</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Disposition
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Dispositions</CardTitle>
            <CardDescription>{dispositions.length} dispositions total</CardDescription>
          </CardHeader>
          <CardContent>
            {dispositions.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No dispositions yet. Create your first disposition to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Callback Eligible</TableHead>
                    <TableHead>DNC Behavior</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispositions.map((disposition) => (
                    <TableRow key={disposition.id}>
                      <TableCell className="font-mono">{disposition.code}</TableCell>
                      <TableCell className="font-medium">{disposition.name}</TableCell>
                      <TableCell>{getCategoryBadge(disposition.category)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{disposition.outcome}</Badge>
                      </TableCell>
                      <TableCell>
                        {disposition.callbackEligible ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>{disposition.dncBehavior || 'N/A'}</TableCell>
                      <TableCell>
                        {disposition.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(disposition)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(disposition.id)}
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
          <DialogTitle>Create Disposition</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="callback">Callback</option>
                  <option value="dnc">DNC</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="outcome">Outcome</Label>
                <Select
                  id="outcome"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                >
                  <option value="terminal">Terminal</option>
                  <option value="non_terminal">Non-Terminal</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retryBehavior">Retry Behavior</Label>
                <Select
                  id="retryBehavior"
                  value={formData.retryBehavior}
                  onChange={(e) => setFormData({ ...formData, retryBehavior: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="retry_later">Retry Later</option>
                  <option value="retry_immediately">Retry Immediately</option>
                  <option value="no_retry">No Retry</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="dncBehavior">DNC Behavior</Label>
                <Select
                  id="dncBehavior"
                  value={formData.dncBehavior}
                  onChange={(e) => setFormData({ ...formData, dncBehavior: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="add_dnc">Add to DNC</option>
                  <option value="no_dnc">No DNC</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="callbackEligible"
                checked={formData.callbackEligible}
                onChange={(e) => setFormData({ ...formData, callbackEligible: e.target.checked })}
              />
              <Label htmlFor="callbackEligible">Callback Eligible</Label>
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
          <DialogTitle>Edit Disposition</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  id="edit-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="callback">Callback</option>
                  <option value="dnc">DNC</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-outcome">Outcome</Label>
                <Select
                  id="edit-outcome"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                >
                  <option value="terminal">Terminal</option>
                  <option value="non_terminal">Non-Terminal</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-retryBehavior">Retry Behavior</Label>
                <Select
                  id="edit-retryBehavior"
                  value={formData.retryBehavior}
                  onChange={(e) => setFormData({ ...formData, retryBehavior: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="retry_later">Retry Later</option>
                  <option value="retry_immediately">Retry Immediately</option>
                  <option value="no_retry">No Retry</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-dncBehavior">DNC Behavior</Label>
                <Select
                  id="edit-dncBehavior"
                  value={formData.dncBehavior}
                  onChange={(e) => setFormData({ ...formData, dncBehavior: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="add_dnc">Add to DNC</option>
                  <option value="no_dnc">No DNC</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-callbackEligible"
                checked={formData.callbackEligible}
                onChange={(e) => setFormData({ ...formData, callbackEligible: e.target.checked })}
              />
              <Label htmlFor="edit-callbackEligible">Callback Eligible</Label>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editingDisposition?.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
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
