'use client';

import { PhoneCall, PhoneOff, UserRound } from 'lucide-react';
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

import { DashboardLayout } from '../../components/dashboard-layout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select } from '../../components/ui/select';
import { apiClient } from '../../lib/api-client';

type Lead = { id: string; firstName: string; lastName: string; email?: string; status: string; phones?: Array<{ id: string; phoneNumber: string; isPrimary: boolean }> };
type Call = { id: string; state: string; phoneNumber: string; lead: Lead; createdAt: string; duration?: number };
type ApiEnvelope<T> = { data: T };

export default function CallsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('offline');
  const [message, setMessage] = useState('');
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);

  const load = async () => {
    const [leadResponse, callResponse, presenceResponse] = await Promise.all([
      apiClient.get<ApiEnvelope<{ leads: Lead[] }>>('/api/v1/leads?take=50'),
      apiClient.get<ApiEnvelope<{ calls: Call[] }>>('/api/v1/calls?take=20'),
      apiClient.get<ApiEnvelope<{ status: string }>>('/api/v1/calls/agent/status'),
    ]);
    setLeads(leadResponse.data.data.leads || []);
    setCalls(callResponse.data.data.calls || []);
    setStatus(presenceResponse.data.data.status || 'offline');
  };

  useEffect(() => {
    void load().catch(() => setMessage('Unable to load calling data.'));
    const tokens = localStorage.getItem('auth_tokens');
    const accessToken = tokens ? JSON.parse(tokens).accessToken : undefined;
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', { path: '/socket.io', auth: { token: accessToken } });
    const refresh = () => { void load().catch(() => setMessage('Unable to refresh calling data.')); };
    ['call.created', 'call.dialing', 'call.ringing', 'call.connected', 'call.completed', 'call.failed', 'call.cancelled'].forEach((event) => socket.on(event, refresh));
    return () => { socket.disconnect(); };
  }, []);

  const chooseLead = (id: string) => {
    setSelectedLeadId(id);
    const lead = leads.find((item) => item.id === id);
    setPhoneNumber(lead?.phones?.find((phone) => phone.isPrimary)?.phoneNumber || lead?.phones?.[0]?.phoneNumber || '');
  };

  const updateStatus = async (nextStatus: string) => {
    await apiClient.put('/api/v1/calls/agent/status', { status: nextStatus });
    setStatus(nextStatus);
  };

  const dial = async () => {
    if (!selectedLeadId || !phoneNumber) return;
    setMessage('Running compliance checks…');
    try {
      await apiClient.post('/api/v1/calls/manual-dial', { leadId: selectedLeadId, phoneNumber });
      setMessage('Call started. Follow the live status below.');
      await load();
    } catch {
      setMessage('The lead was not eligible or the call could not be started.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual Calling</h1>
          <p className="mt-2 text-gray-600">Preview a lead, complete compliance checks, then place one manual call.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Preview Dial</CardTitle><CardDescription>Automatic and predictive dialing are disabled.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedLeadId} onChange={(event) => chooseLead(event.target.value)}>
                <option value="">Select an eligible lead</option>
                {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.firstName} {lead.lastName} · {lead.status}</option>)}
              </Select>
              {selectedLead && <div className="rounded-lg border bg-gray-50 p-4"><div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-indigo-600" /><div><p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p><p className="text-sm text-gray-500">{selectedLead.email || 'No email'} · Consent and DNC checked before dialing</p></div></div></div>}
              <Select value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} disabled={!selectedLead}>
                <option value="">Select phone</option>
                {selectedLead?.phones?.map((phone) => <option key={phone.id} value={phone.phoneNumber}>{phone.phoneNumber}{phone.isPrimary ? ' · Primary' : ''}</option>)}
              </Select>
              <div className="flex gap-3"><Button onClick={() => void dial()} disabled={!selectedLeadId || !phoneNumber || status !== 'available'}><PhoneCall className="mr-2 h-4 w-4" />Dial manually</Button><Badge variant={status === 'available' ? 'success' : 'secondary'}>{status}</Badge></div>
              {message && <p className="text-sm text-gray-600">{message}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Agent Status</CardTitle><CardDescription>Only Available agents can start a call.</CardDescription></CardHeader>
            <CardContent className="space-y-4"><Select value={status} onChange={(event) => void updateStatus(event.target.value)}><option value="offline">Offline</option><option value="available">Available</option><option value="paused">Paused</option><option value="wrap_up">Wrap Up</option></Select><p className="text-sm text-gray-500">The platform prevents simultaneous manual calls for the same agent.</p></CardContent>
          </Card>
        </div>
        <Card><CardHeader><CardTitle>Call History</CardTitle><CardDescription>Recent manual call sessions and their terminal states.</CardDescription></CardHeader><CardContent>{calls.length === 0 ? <p className="text-sm text-gray-500">No calls yet.</p> : <div className="space-y-3">{calls.map((call) => <div key={call.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{call.lead?.firstName} {call.lead?.lastName}</p><p className="text-sm text-gray-500">{call.phoneNumber} · {new Date(call.createdAt).toLocaleString()}</p></div><Badge variant={call.state === 'connected' ? 'success' : 'secondary'}>{call.state}</Badge></div>)}</div>}</CardContent></Card>
        <div className="flex items-center gap-2 text-xs text-gray-500"><PhoneOff className="h-3 w-3" /> Mock adapter active · No external telephony software required</div>
      </div>
    </DashboardLayout>
  );
}
