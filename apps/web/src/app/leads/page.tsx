'use client';

import { Search, User, Mail, Clock } from 'lucide-react';
import { useState } from 'react';

import { DashboardLayout } from '../../components/dashboard-layout';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { useLeads, useUpdateLeadStatus } from '../../lib/api/leads';

export default function LeadsPage() {
  const { data: leadsData, isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');

  const leads = leadsData?.data || [];

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    const matchesCampaign = !campaignFilter || lead.campaignId === campaignFilter;
    return matchesSearch && matchesStatus && matchesCampaign;
  });

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id: leadId, status });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; label: string }> = {
      new: { variant: 'secondary', label: 'New' },
      eligible: { variant: 'default', label: 'Eligible' },
      assigned: { variant: 'success', label: 'Assigned' },
      in_progress: { variant: 'warning', label: 'In Progress' },
      callback: { variant: 'warning', label: 'Callback' },
      contacted: { variant: 'success', label: 'Contacted' },
      not_contacted: { variant: 'secondary', label: 'Not Contacted' },
      dnc: { variant: 'destructive', label: 'DNC' },
      disqualified: { variant: 'destructive', label: 'Disqualified' },
      converted: { variant: 'success', label: 'Converted' },
      exhausted: { variant: 'secondary', label: 'Exhausted' },
      archived: { variant: 'secondary', label: 'Archived' },
    };
    const config = variants[status] || variants.new;
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="mt-2 text-gray-600">Manage your leads and their status</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="eligible">Eligible</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="callback">Callback</option>
                  <option value="contacted">Contacted</option>
                  <option value="dnc">DNC</option>
                  <option value="converted">Converted</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="campaign">Campaign</Label>
                <Select
                  id="campaign"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                >
                  <option value="">All Campaigns</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>{filteredLeads.length} leads total</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No leads found matching your filters.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{lead.externalId || 'No external ID'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{lead.email || 'No email'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>{lead.timezone}</TableCell>
                      <TableCell>
                        {lead.assignedTo ? (
                          <Badge variant="outline">Assigned</Badge>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className="w-32"
                          >
                            <option value="new">New</option>
                            <option value="eligible">Eligible</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="callback">Callback</option>
                            <option value="contacted">Contacted</option>
                            <option value="dnc">DNC</option>
                            <option value="converted">Converted</option>
                          </Select>
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
    </DashboardLayout>
  );
}
