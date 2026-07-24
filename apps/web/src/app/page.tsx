'use client';

import { Phone, FileSpreadsheet, Users } from 'lucide-react';

import { DashboardLayout } from '../components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LoadingSpinner } from '../components/ui/loading';
import { useCampaigns } from '../lib/api/campaigns';
import { useLeadLists } from '../lib/api/lead-lists';

export default function HomePage() {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns({ limit: 5 });
  const { data: leadLists, isLoading: leadListsLoading } = useLeadLists({ limit: 5 });

  if (campaignsLoading || leadListsLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const stats = [
    { name: 'Total Campaigns', value: campaigns?.total || 0, icon: Phone, color: 'bg-indigo-500' },
    { name: 'Active Campaigns', value: campaigns?.data?.filter(c => c.status === 'active').length || 0, icon: Phone, color: 'bg-green-500' },
    { name: 'Lead Lists', value: leadLists?.total || 0, icon: FileSpreadsheet, color: 'bg-blue-500' },
    { name: 'Total Leads', value: leadLists?.data?.reduce((sum, list) => sum + list.totalRows, 0) || 0, icon: Users, color: 'bg-purple-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to RDCS In-House Dialer Platform</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your most recently created campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns?.data && campaigns.data.length > 0 ? (
                <div className="space-y-4">
                  {campaigns.data.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500">{campaign.status}</p>
                      </div>
                      <span className="text-sm text-gray-500">{campaign.timezone}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No campaigns yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Lead Lists</CardTitle>
              <CardDescription>Your most recently created lead lists</CardDescription>
            </CardHeader>
            <CardContent>
              {leadLists?.data && leadLists.data.length > 0 ? (
                <div className="space-y-4">
                  {leadLists.data.slice(0, 5).map((list) => (
                    <div key={list.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{list.name}</p>
                        <p className="text-sm text-gray-500">{list.totalRows} leads</p>
                      </div>
                      <span className="text-sm text-gray-500">{list.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No lead lists yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
