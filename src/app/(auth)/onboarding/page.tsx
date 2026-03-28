'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/hooks/use-auth';
import { EDUCATION_LEVELS } from '@/lib/constants';
import type { Topic } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Profile fields
  const [educationLevel, setEducationLevel] = useState('');
  const [profession, setProfession] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    async function loadTopics() {
      try {
        const { data, error } = await insforge.database
          .from('topics')
          .select('*')
          .order('name', { ascending: true });
        if (error) {
          console.error('Failed to load topics:', error);
          toast.error('Failed to load topics');
          return;
        }
        if (data) setTopics(data as Topic[]);
      } catch (err) {
        console.error('Error loading topics:', err);
        toast.error('Failed to load topics');
      }
    }
    loadTopics();
  }, []);

  function toggleTopic(topicId: string) {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  }

  async function handleComplete() {
    if (!educationLevel) {
      toast.error('Please select your education level');
      return;
    }
    if (selectedTopics.length < 1) {
      toast.error('Please select at least one topic of interest');
      return;
    }

    setLoading(true);
    try {
      // Save profile
      const { error: profileError } = await insforge.auth.setProfile({
        education_level: educationLevel,
        profession,
        interests: JSON.stringify(selectedTopics),
        onboarding_complete: true,
      });

      if (profileError) {
        toast.error('Failed to save profile');
        return;
      }

      // Create initial knowledge profiles for selected topics
      const userId = user?.id;
      if (userId) {
        const profiles = selectedTopics.map((topicId) => ({
          user_id: userId,
          topic_id: topicId,
          level: 20,
        }));
        await insforge.database.from('knowledge_profiles').insert(profiles);
      }

      await refreshUser();
      toast.success('Profile complete! Welcome to AdaptLearn.');
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Set up your profile</CardTitle>
          <CardDescription>
            Step {step} of 2 — {step === 1 ? 'Tell us about yourself' : 'Choose your interests'}
          </CardDescription>
          <div className="flex gap-2 justify-center mt-4">
            <div className={`h-1.5 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="education">Education Level</Label>
                <Select value={educationLevel} onValueChange={(val) => { if (val !== null) setEducationLevel(val); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your education level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profession (optional)</Label>
                <Input
                  id="profession"
                  placeholder="e.g. Software Engineer, Student, Teacher"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!educationLevel) {
                    toast.error('Please select your education level');
                    return;
                  }
                  setStep(2);
                }}
              >
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select topics you&apos;re interested in learning about. This helps us personalize
                your reading experience.
              </p>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => {
                  const isSelected = selectedTopics.includes(topic.id);
                  return (
                    <Badge
                      key={topic.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1.5 text-sm transition-colors"
                      onClick={() => toggleTopic(topic.id)}
                    >
                      {isSelected && <Check className="mr-1 h-3 w-3" />}
                      {topic.name}
                    </Badge>
                  );
                })}
              </div>
              {selectedTopics.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleComplete} disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Complete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
