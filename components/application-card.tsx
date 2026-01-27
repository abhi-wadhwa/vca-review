'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Application } from '@/lib/db/schema';
import { ExternalLink, Mail, Linkedin, FileText } from 'lucide-react';

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
              {application.major && (
                <Badge variant="outline">{application.major}</Badge>
              )}
              {application.classStanding && (
                <Badge variant="secondary">{application.classStanding}</Badge>
              )}
              {application.fridayAvailability && (
                <Badge variant="outline">Friday: {application.fridayAvailability}</Badge>
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
              Question 1: Where does VCA fit in your path, and what are you hoping to get out of joining?
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question1Response}
            </p>
          </div>
        )}

        {application.question2Response && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Question 2: Tell us about a company or product you find fascinating.
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question2Response}
            </p>
          </div>
        )}

        {application.question3Response && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Question 3: Describe a situation where you worked with someone who strongly disagreed with you.
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question3Response}
            </p>
          </div>
        )}

        {application.question4Response && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Question 4: If you could have dinner with one founder, who would you choose?
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question4Response}
            </p>
          </div>
        )}

        {application.question5Response && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Question 5: If you could get an honest answer to one question from any founder, what would you ask?
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.question5Response}
            </p>
          </div>
        )}

        {application.anythingElse && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Anything Else
            </h4>
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {application.anythingElse}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
