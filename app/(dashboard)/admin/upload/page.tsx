export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CsvUploader } from '@/components/csv-uploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function UploadPage() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/review');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Applications</h1>
        <p className="text-muted-foreground">
          Import applicant data from a CSV file.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Drag and drop a CSV file or click to browse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvUploader />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format Requirements</CardTitle>
            <CardDescription>
              Your CSV file should include the following columns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Expected Format</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload the Google Form CSV export directly. The first row should be headers. Columns are automatically mapped.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>Required:</strong> Name, USC Email</li>
                  <li><strong>Optional:</strong> Timestamp, Major/Minor, Class Standing, Friday Availability, Resume, LinkedIn, 5 Essay Questions, Anything Else</li>
                </ul>
              </div>

              <div className="text-sm text-muted-foreground">
                <p><strong>Note:</strong> Duplicate emails will be automatically skipped during import.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
