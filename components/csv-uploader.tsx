'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadApplications } from '@/lib/actions/applications';
import { cn } from '@/lib/utils';

interface UploadResult {
  success: number;
  duplicates: number;
  errors: string[];
}

// Column mapping for Google Form CSV headers
const columnMappings: Record<string, string> = {
  'timestamp': 'timestamp',
  'name': 'fullName',
  'full_name': 'fullName',
  'fullname': 'fullName',
  'usc_email': 'email',
  'email': 'email',
  'email_address': 'email',
  'major/minor': 'major',
  'major': 'major',
  'class_standing': 'classStanding',
  'are_you_free_@_11am-12pm_on_fridays_for_our_cohort_curriculum_meetings?': 'fridayAvailability',
  'resume': 'resumeUrl',
  'resume_url': 'resumeUrl',
  'linkedin_(optional)': 'linkedinUrl',
  'linkedin': 'linkedinUrl',
  'linkedin_url': 'linkedinUrl',
  'based_on_your_long-term_goals,_where_does_vca_fit_in_your_path,_and_what_are_you_hoping_to_get_out_of_joining_this_organization?_(250_words_max)': 'question1Response',
  'tell_us_about_a_company_or_product_you_find_fascinating._if_you_had_to_explain_to_an_investor_why_it_might_succeed_or_fail,_what_would_you_focus_on?_(150_words_max)': 'question2Response',
  'describe_a_situation_where_you_had_to_work_with_someone_who_strongly_disagreed_with_you._how_did_you_handle_the_situation,_and_what_steps_did_you_take_to_keep_the_work_moving_forward?_(150_words_max)': 'question3Response',
  'if_you_could_have_dinner_with_one_founder,_who_would_you_choose?_what_specifically_would_you_want_to_learn_from_them,_and_how_would_that_insight_shape_the_way_you_build,_lead,_or_make_decisions?_(100-150_words)': 'question4Response',
  'if_you_could_get_an_honest_answer_to_one_question_from_any_founder,_what_would_you_ask_and_why?_(50_words_max)': 'question5Response',
  'anything_else_you_want_like_us_to_know?': 'anythingElse',
};

function normalizeColumnName(name: string): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, '_');
  return columnMappings[normalized] || normalized;
}

function mapRowToApplication(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key);
    mapped[normalizedKey] = value;
  }
  return mapped;
}

export function CsvUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[] | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }

        const data = results.data as Record<string, string>[];
        if (data.length === 0) {
          setError('CSV file is empty');
          return;
        }

        // Map column names
        const mappedData = data.map(mapRowToApplication);
        setPreviewData(mappedData.slice(0, 5));
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleUpload = async () => {
    if (!previewData) return;

    setIsUploading(true);
    setError(null);

    try {
      // Re-parse the full file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = fileInput?.files?.[0];

      if (!file) {
        setError('No file selected');
        setIsUploading(false);
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const data = (results.data as Record<string, string>[]).map(mapRowToApplication);
          const uploadResult = await uploadApplications(data);

          if ('error' in uploadResult) {
            setError(uploadResult.error as string);
          } else {
            setResult(uploadResult);
            setPreviewData(null);
          }
          setIsUploading(false);
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
          setIsUploading(false);
        },
      });
    } catch {
      setError('Failed to upload applications');
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-lg font-medium">Drop the CSV file here...</p>
        ) : (
          <>
            <p className="text-lg font-medium">Drag & drop a CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to select a file</p>
          </>
        )}
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-2 pt-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {previewData && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              <span className="font-medium">Preview (first 5 rows)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Major</th>
                    <th className="text-left p-2">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{row.fullName}</td>
                      <td className="p-2">{row.email}</td>
                      <td className="p-2">{row.major}</td>
                      <td className="p-2">{row.classStanding}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewData(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">Upload Complete</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><strong>{result.success}</strong> applications imported successfully</p>
              {result.duplicates > 0 && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  <strong>{result.duplicates}</strong> duplicates skipped
                </p>
              )}
              {result.errors.length > 0 && (
                <p className="text-red-600 dark:text-red-400">
                  <strong>{result.errors.length}</strong> errors encountered
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
