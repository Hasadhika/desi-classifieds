import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import {
  Copy, AlertOctagon, Tag, Plus, Trash2, Save,
  RefreshCw, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function ContentModeration() {
  const queryClient = useQueryClient();
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordSearch, setKeywordSearch] = useState("");
  const [localSettings, setLocalSettings] = useState({});

  const { data: keywords = [], isLoading: loadingKeywords } = useQuery({
    queryKey: ["blocked-keywords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_keywords")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["content-moderation-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_moderation_settings")
        .select("*");
      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      const map = {};
      data.forEach(s => { map[s.key] = s.value; });
      setLocalSettings(map);
    },
  });

  const settingsMap = React.useMemo(() => {
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  React.useEffect(() => {
    if (settings.length > 0) {
      const map = {};
      settings.forEach(s => { map[s.key] = s.value; });
      setLocalSettings(map);
    }
  }, [settings]);

  const addKeywordMutation = useMutation({
    mutationFn: async (keyword) => {
      const { error } = await supabase
        .from("blocked_keywords")
        .insert([{ keyword: keyword.toLowerCase().trim() }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-keywords"] });
      toast.success("Keyword blocked");
      setNewKeyword("");
    },
    onError: (err) => toast.error(err.message || "Failed to add keyword"),
  });

  const deleteKeywordMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("blocked_keywords")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-keywords"] });
      toast.success("Keyword removed");
    },
    onError: () => toast.error("Failed to remove keyword"),
  });

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const { error } = await supabase
        .from("content_moderation_settings")
        .update({ value: String(value), updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-moderation-settings"] });
      toast.success("Setting saved");
    },
    onError: () => toast.error("Failed to save setting"),
  });

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywords.some(k => k.keyword === trimmed.toLowerCase())) {
      toast.error("This keyword is already blocked");
      return;
    }
    addKeywordMutation.mutate(trimmed);
  };

  const filteredKeywords = keywords.filter(k =>
    !keywordSearch || k.keyword.includes(keywordSearch.toLowerCase())
  );

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    const saves = Object.entries(localSettings).map(([key, value]) =>
      saveSettingMutation.mutateAsync({ key, value })
    );
    Promise.all(saves);
  };

  return (
    <div className="space-y-5">
      <Tabs defaultValue="duplicate">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="duplicate" className="gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Duplicate Detection
          </TabsTrigger>
          <TabsTrigger value="spam" className="gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            Spam Posting Limit
          </TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Blocked Keywords
            {keywords.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1 h-4 px-1">{keywords.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplicate" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#D80621]" />
                Duplicate Detection Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Enable Duplicate Detection</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically flag listings that appear to be duplicates of existing ones
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.duplicate_detection_enabled === "true"}
                      onCheckedChange={(checked) => {
                        handleSettingChange("duplicate_detection_enabled", checked ? "true" : "false");
                      }}
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-800">Similarity Threshold (%)</Label>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3">
                        Listings with title/description similarity above this threshold will be flagged as duplicates
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={50}
                        max={100}
                        value={localSettings.duplicate_similarity_threshold || "80"}
                        onChange={(e) => handleSettingChange("duplicate_similarity_threshold", e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      <span className="text-xs text-gray-400 ml-2">
                        (Recommended: 80%)
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border border-amber-100 bg-amber-50 rounded-xl text-xs text-amber-700">
                    Duplicate detection compares listing titles and descriptions. Flagged duplicates will appear in the Listings page with a "flagged" status for admin review.
                  </div>

                  <div className="flex justify-end">
                    <Button
                      className="bg-[#D80621] hover:bg-[#B00520]"
                      onClick={handleSaveSettings}
                      disabled={saveSettingMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spam" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[#D80621]" />
                Spam Posting Limit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Enable Spam Detection</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Restrict users from posting more than the allowed number of listings per day
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.spam_detection_enabled === "true"}
                      onCheckedChange={(checked) => {
                        handleSettingChange("spam_detection_enabled", checked ? "true" : "false");
                      }}
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-800">Daily Posting Limit</Label>
                      <p className="text-xs text-gray-500 mt-0.5 mb-3">
                        Maximum number of listings a user can post per day before being flagged
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={localSettings.spam_posting_limit || "5"}
                        onChange={(e) => handleSettingChange("spam_posting_limit", e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">listings / day</span>
                    </div>
                  </div>

                  <div className="p-4 border border-amber-100 bg-amber-50 rounded-xl text-xs text-amber-700">
                    Users who exceed this limit will have their additional listings auto-set to "pending" for review. Paid users and advertisers follow a higher limit (2x this value).
                  </div>

                  <div className="flex justify-end">
                    <Button
                      className="bg-[#D80621] hover:bg-[#B00520]"
                      onClick={handleSaveSettings}
                      disabled={saveSettingMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#D80621]" />
                Blocked Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Listings containing these keywords in their title or description will be automatically flagged for review.
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="Add keyword to block..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                  className="flex-1"
                />
                <Button
                  className="bg-[#D80621] hover:bg-[#B00520]"
                  onClick={handleAddKeyword}
                  disabled={addKeywordMutation.isPending || !newKeyword.trim()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {keywords.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search keywords..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              {loadingKeywords ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : filteredKeywords.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{keywordSearch ? "No matching keywords" : "No blocked keywords yet"}</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredKeywords.map(kw => (
                    <div
                      key={kw.id}
                      className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-700 rounded-full px-3 py-1 text-sm"
                    >
                      <span>{kw.keyword}</span>
                      <button
                        onClick={() => deleteKeywordMutation.mutate(kw.id)}
                        className="hover:text-red-900 ml-0.5"
                        disabled={deleteKeywordMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {keywords.length > 0 && (
                <p className="text-xs text-gray-400 text-right">{keywords.length} keyword{keywords.length !== 1 ? "s" : ""} blocked</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
