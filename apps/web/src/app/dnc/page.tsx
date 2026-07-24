'use client';

import { Edit, Trash2, XCircle, Phone } from 'lucide-react';
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
import { useDNCLists, useCreateDNCList, useUpdateDNCList, useDeleteDNCList, useAddDNCEntries } from '../../lib/api/dnc';

export default function DNCPage() {
  const { data: dncListsData, isLoading } = useDNCLists();
  const createDNCList = useCreateDNCList();
  const updateDNCList = useUpdateDNCList();
  const deleteDNCList = useDeleteDNCList();
  const addDNCEntries = useAddDNCEntries();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddEntriesDialogOpen, setIsAddEntriesDialogOpen] = useState(false);
  const [editingDNCList, setEditingDNCList] = useState<any>(null);
  const [selectedDNCList, setSelectedDNCList] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'tenant',
    scope: 'all',
  });
  const [entriesText, setEntriesText] = useState('');

  const dncLists = dncListsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDNCList.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', type: 'tenant', scope: 'all' });
    } catch (error) {
      console.error('Failed to create DNC list:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDNCList) return;
    try {
      await updateDNCList.mutateAsync({ id: editingDNCList.id, data: formData });
      setIsEditDialogOpen(false);
      setEditingDNCList(null);
    } catch (error) {
      console.error('Failed to update DNC list:', error);
    }
  };

  const openEditDialog = (dncList: any) => {
    setEditingDNCList(dncList);
    setFormData({
      name: dncList.name,
      description: dncList.description || '',
      type: dncList.type,
      scope: dncList.scope,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this DNC list?')) return;
    try {
      await deleteDNCList.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete DNC list:', error);
    }
  };

  const handleAddEntries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDNCList) return;
    
    const phoneNumbers = entriesText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    try {
      await addDNCEntries.mutateAsync({ dncListId: selectedDNCList.id, phoneNumbers });
      setIsAddEntriesDialogOpen(false);
      setEntriesText('');
      setSelectedDNCList(null);
    } catch (error) {
      console.error('Failed to add DNC entries:', error);
    }
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Do Not Call Lists</h1>
          <p className="mt-2 text-gray-600">Manage DNC lists to comply with calling regulations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All DNC Lists</CardTitle>
            <CardDescription>{dncLists.length} DNC lists total</CardDescription>
          </CardHeader>
          <CardContent>
            {dncLists.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No DNC lists yet. Create your first DNC list to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dncLists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{list.name}</p>
                          <p className="text-sm text-gray-500">{list.description || 'No description'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{list.type}</Badge>
                      </TableCell>
                      <TableCell>{list.scope}</TableCell>
                      <TableCell>{list.entryCount}</TableCell>
                      <TableCell>
                        {list.isActive ? (
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
                            onClick={() => {
                              setSelectedDNCList(list);
                              setIsAddEntriesDialogOpen(true);
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
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
          <DialogTitle>Create DNC List</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="tenant">Tenant</option>
                  <option value="campaign">Campaign</option>
                  <option value="global">Global</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="scope">Scope</Label>
                <Select
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                >
                  <option value="all">All</option>
                  <option value="specific_campaign">Specific Campaign</option>
                  <option value="specific_purpose">Specific Purpose</option>
                </Select>
              </div>
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
          <DialogTitle>Edit DNC List</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  id="edit-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="tenant">Tenant</option>
                  <option value="campaign">Campaign</option>
                  <option value="global">Global</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-scope">Scope</Label>
                <Select
                  id="edit-scope"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                >
                  <option value="all">All</option>
                  <option value="specific_campaign">Specific Campaign</option>
                  <option value="specific_purpose">Specific Purpose</option>
                </Select>
              </div>
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

      {/* Add Entries Dialog */}
      <Dialog isOpen={isAddEntriesDialogOpen} onClose={() => setIsAddEntriesDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Add Phone Numbers to DNC List</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleAddEntries} className="space-y-4">
            <div>
              <Label htmlFor="entries">Phone Numbers (one per line)</Label>
              <Textarea
                id="entries"
                value={entriesText}
                onChange={(e) => setEntriesText(e.target.value)}
                placeholder="+1234567890&#10;+1987654321&#10;+1555123456"
                rows={10}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddEntriesDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Entries</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
