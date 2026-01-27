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
                <h4 className="font-medium text-sm mb-2">Required Columns</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">fullName</code> or <code className="bg-muted px-1 rounded">full_name</code> - Applicant&apos;s full name</li>
                  <li><code className="bg-muted px-1 rounded">email</code> - Email address (used for duplicate detection)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Optional Columns</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">phoneNumber</code> or <code className="bg-muted px-1 rounded">phone</code></li>
                  <li><code className="bg-muted px-1 rounded">university</code> or <code className="bg-muted px-1 rounded">school</code></li>
                  <li><code className="bg-muted px-1 rounded">major</code></li>
                  <li><code className="bg-muted px-1 rounded">graduationYear</code> or <code className="bg-muted px-1 rounded">graduation_year</code></li>
                  <li><code className="bg-muted px-1 rounded">linkedinUrl</code> or <code className="bg-muted px-1 rounded">linkedin</code></li>
                  <li><code className="bg-muted px-1 rounded">resumeUrl</code> or <code className="bg-muted px-1 rounded">resume</code></li>
                  <li><code className="bg-muted px-1 rounded">question1</code>, <code className="bg-muted px-1 rounded">question2</code>, <code className="bg-muted px-1 rounded">question3</code></li>
                </ul>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <h4 className="font-medium text-sm mb-2">Example CSV</h4>
                <pre className="text-xs overflow-x-auto">
{`fullName,email,university,major,graduationYear
John Doe,john@example.com,MIT,Computer Science,2025
Jane Smith,jane@example.com,Stanford,Data Science,2024`}
                </pre>
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
