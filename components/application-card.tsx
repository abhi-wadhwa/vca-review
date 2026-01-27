'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Application } from '@/lib/db/schema';
import { ExternalLink, GraduationCap, Mail, Phone, Linkedin, FileText } from 'lucide-react';

interface ApplicationCardProps {
  application: Application;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{application.fullName}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {application.university && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {application.university}
                </Badge>
              )}
              {application.major && (
                <Badge variant="outline">{application.major}</Badge>
              )}
              {application.graduationYear && (
                <Badge variant="outline">Class of {application.graduationYear}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${application.email}`} className="hover:text-primary">
              {application.email}
            </a>
          </div>
          {application.phoneNumber && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span>{application.phoneNumber}</span>
            </div>
          )}
          {application.linkedinUrl && (
            <a
              href={application.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {application.resumeUrl && (
            <a
              href={application.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <FileText className="h-4 w-4" />
              Resume
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Question Responses */}
        {application.question1Response && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Question 1: Why do you want to join VCA?
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question1Response}
            </p>
          </div>
        )}

        {application.question2Response && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Question 2: Describe a project you&apos;re proud of
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question2Response}
            </p>
          </div>
        )}

        {application.question3Response && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Question 3: How do you handle challenges?
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question3Response}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
