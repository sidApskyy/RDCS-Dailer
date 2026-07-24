'use client';

import { Plus, CheckCircle, XCircle, Shield } from 'lucide-react';
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
import { useConsents, useCreateConsent, useRevokeConsent } from '../../lib/api/consent';

export default function ConsentPage() {
  const { data: consentsData, isLoading } = useConsents();
  const createConsent = useCreateConsent();
  const revokeConsent = useRevokeConsent();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leadId: '',
    phoneNumber: '',
    type: 'express',
    source: '',
    method: '',
    jurisdiction: '',
    scope: '',
    expiresAt: '',
  });

  const consents = consentsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConsent.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        leadId: '',
        phoneNumber: '',
        type: 'express',
        source: '',
        method: '',
        jurisdiction: '',
        scope: '',
        expiresAt: '',
      });
    } catch (error) {
      console.error('Failed to create consent:', error);
    }
  };

  const handleRevoke = async (leadId: string) => {
    if (!confirm('Are you sure you want to revoke this consent?')) return;
    try {
      await revokeConsent.mutateAsync({ leadId, reason: 'User requested' });
    } catch (error) {
      console.error('Failed to revoke consent:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: any; label: string }> = {
      granted: { variant: 'success', icon: CheckCircle, label: 'Granted' },
      revoked: { variant: 'destructive', icon: XCircle, label: 'Revoked' },
      expired: { variant: 'secondary', icon: XCircle, label: 'Expired' },
      unknown: { variant: 'secondary', icon: Shield, label: 'Unknown' },
    };
    const config = variants[status] || variants.unknown;
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
            <h1 className="text-3xl font-bold text-gray-900">Consent Management</h1>
            <p className="mt-2 text-gray-600">Track and manage consent for communications</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Consent
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Consents</CardTitle>
            <CardDescription>{consents.length} consent records total</CardDescription>
          </CardHeader>
          <CardContent>
            {consents.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No consent records yet. Add consent for a lead to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consents.map((consent) => (
                    <TableRow key={consent.id}>
                      <TableCell className="font-mono text-sm">{consent.leadId}</TableCell>
                      <TableCell>{consent.phoneNumber || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(consent.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{consent.type}</Badge>
                      </TableCell>
                      <TableCell>{consent.source || 'N/A'}</TableCell>
                      <TableCell>{consent.method || 'N/A'}</TableCell>
                      <TableCell>{consent.jurisdiction || 'N/A'}</TableCell>
                      <TableCell>
                        {consent.expiresAt
                          ? new Date(consent.expiresAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {consent.status === 'granted' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevoke(consent.leadId)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
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
          <DialogTitle>Add Consent</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="express">Express</option>
                  <option value="implied">Implied</option>
                  <option value="verbal">Verbal</option>
                  <option value="written">Written</option>
                  <option value="electronic">Electronic</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="website, phone, email, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="method">Method</Label>
                <Input
                  id="method"
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  placeholder="checkbox, signature, etc."
                />
              </div>
              <div>
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input
                  id="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  placeholder="US, EU, etc."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="scope">Scope</Label>
              <Input
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="all_communications, specific_campaign, etc."
              />
            </div>
            <div>
              <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Consent</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
