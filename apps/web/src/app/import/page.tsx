'use client';

import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';

import { DashboardLayout } from '../../components/dashboard-layout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table';
import { useImports } from '../../lib/api/lead-import';
import { useLeadLists } from '../../lib/api/lead-lists';

export default function ImportPage() {
  const { data: leadListsData } = useLeadLists();
  const { data: importsData, isLoading } = useImports();
  
  const [selectedLeadList, setSelectedLeadList] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const leadLists = leadListsData?.data || [];
  const imports = importsData?.data || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedLeadList) return;
    
    setUploading(true);
    try {
      // Upload functionality to be implemented when backend endpoint is available
      console.log('Upload not yet implemented:', { leadListId: selectedLeadList, file: file.name });
      setFile(null);
      setSelectedLeadList('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      processing: { variant: 'warning', icon: AlertCircle, label: 'Processing' },
      completed: { variant: 'success', icon: CheckCircle, label: 'Completed' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
      partially_completed: { variant: 'warning', icon: AlertCircle, label: 'Partial' },
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV Import</h1>
          <p className="mt-2 text-gray-600">Upload CSV files to import leads into your lead lists</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Select a lead list and upload a CSV file to import leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leadList">Lead List</Label>
                <Select
                  id="leadList"
                  value={selectedLeadList}
                  onChange={(e) => setSelectedLeadList(e.target.value)}
                >
                  <option value="">Select a lead list</option>
                  {leadLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list.totalRows} leads)
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="file">CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              )}
              <Button
                onClick={handleUpload}
                disabled={!file || !selectedLeadList || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>Recent CSV imports and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {imports.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No imports yet. Upload your first CSV file to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Rows</TableHead>
                    <TableHead>Successful</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Duplicates</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{imp.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(imp.status)}</TableCell>
                      <TableCell>{imp.totalRows}</TableCell>
                      <TableCell>{imp.successfulRows}</TableCell>
                      <TableCell>{imp.failedRows}</TableCell>
                      <TableCell>{imp.duplicateRows}</TableCell>
                      <TableCell>{new Date(imp.createdAt).toLocaleDateString()}</TableCell>
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
