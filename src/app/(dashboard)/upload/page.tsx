'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { uploadAndProcessFile, processUrlImport } from '@/services/content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link2, Loader2, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || !user) return;

      setFileName(file.name);
      setUploading(true);
      setProcessing(false);

      try {
        toast.info(`Uploading ${file.name}...`);
        setUploading(false);
        setProcessing(true);
        toast.info('Processing document with AI...');

        const contentId = await uploadAndProcessFile(file, user.id);

        toast.success('Document processed successfully!');
        router.push(`/read/${contentId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
        setUploading(false);
        setProcessing(false);
      }
    },
    [user, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: uploading || processing,
  });

  async function handleUrlImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !user) return;

    setProcessing(true);
    try {
      toast.info('Importing and processing URL...');
      const contentId = await processUrlImport(url, user.id);
      toast.success('Content imported successfully!');
      router.push(`/read/${contentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Content</h1>
        <p className="text-muted-foreground">
          Upload a document or import from a URL. Our AI will analyze and structure it for adaptive reading.
        </p>
      </div>

      <Tabs defaultValue="file">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">
            <Upload className="mr-2 h-4 w-4" /> File Upload
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="mr-2 h-4 w-4" /> URL Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <Card>
            <CardHeader>
              <CardTitle>Upload a document</CardTitle>
              <CardDescription>Supports PDF, TXT, and Markdown files up to 20MB.</CardDescription>
            </CardHeader>
            <CardContent>
              {processing ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-medium">Processing {fileName}...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is extracting text, splitting sections, and analyzing difficulty.
                  </p>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  {isDragActive ? (
                    <p className="font-medium">Drop the file here...</p>
                  ) : (
                    <>
                      <p className="font-medium">Drag & drop a file here, or click to browse</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        PDF, TXT, or MD up to 20MB
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle>Import from URL</CardTitle>
              <CardDescription>
                Paste a URL and we&apos;ll extract the content for adaptive reading.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUrlImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Web page URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={processing}
                    required
                  />
                </div>
                <Button type="submit" disabled={processing || !url} className="w-full">
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" /> Import & Process
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
