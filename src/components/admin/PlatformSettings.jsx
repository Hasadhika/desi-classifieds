import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Save, DollarSign, FileText, TrendingUp, Clock, Image, AlignLeft, ShieldAlert, Phone } from "lucide-react";

const PRICING_SETTINGS = [
  {
    key: "free_ads_limit",
    label: "Free Ads Limit",
    description: "Number of free ads each user can post before payment is required",
    icon: <FileText className="w-4 h-4" />,
    type: "number",
    min: 0,
    suffix: "ads",
  },
  {
    key: "post_ad_price",
    label: "Additional Ad Price (CAD)",
    description: "Price charged per ad after the free limit is reached",
    icon: <DollarSign className="w-4 h-4" />,
    type: "number",
    step: "0.01",
    prefix: "$",
  },
  {
    key: "promotion_price",
    label: "Homepage Promotion Price (CAD)",
    description: "Price to promote a listing on the homepage",
    icon: <TrendingUp className="w-4 h-4" />,
    type: "number",
    step: "0.01",
    prefix: "$",
  },
  {
    key: "promotion_duration_days",
    label: "Promotion Duration",
    description: "How many days a promoted listing stays on the homepage",
    icon: <Clock className="w-4 h-4" />,
    type: "number",
    min: 1,
    suffix: "days",
  },
];

const RESTRICTION_SETTINGS = [
  {
    key: "max_images_per_listing",
    label: "Max Images Per Listing",
    description: "Maximum number of images a user can upload per listing",
    icon: <Image className="w-4 h-4" />,
    type: "number",
    min: 1,
    max: 30,
    suffix: "images",
  },
  {
    key: "max_listing_title_length",
    label: "Max Title Length",
    description: "Maximum number of characters allowed in a listing title",
    icon: <AlignLeft className="w-4 h-4" />,
    type: "number",
    min: 20,
    suffix: "characters",
  },
  {
    key: "max_listing_price",
    label: "Max Listing Price (CAD)",
    description: "Maximum price a user can set for any listing",
    icon: <ShieldAlert className="w-4 h-4" />,
    type: "number",
    min: 0,
    prefix: "$",
  },
];

const TOGGLE_SETTINGS = [
  {
    key: "require_phone_number",
    label: "Require Phone Number",
    description: "Make phone number mandatory when posting a listing",
    icon: <Phone className="w-4 h-4" />,
  },
];

export default function PlatformSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["platform-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setValues(map);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (updates) => {
      for (const [key, value] of Object.entries(updates)) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ value: String(value), updated_at: new Date().toISOString() })
          .eq("key", key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-[#D80621]" />
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Platform Settings</h2>
          <p className="text-sm text-gray-500">Configure pricing, limits, and content restrictions</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          Pricing & Limits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRICING_SETTINGS.map((def) => (
            <Card key={def.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                  <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-[#D80621]">
                    {def.icon}
                  </span>
                  {def.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">{def.description}</p>
                <div className="flex items-center gap-2">
                  {def.prefix && <span className="text-sm text-gray-500 font-medium">{def.prefix}</span>}
                  <Input
                    type={def.type}
                    min={def.min}
                    step={def.step}
                    value={values[def.key] || ""}
                    onChange={(e) => setValues(v => ({ ...v, [def.key]: e.target.value }))}
                    className="flex-1"
                  />
                  {def.suffix && <span className="text-sm text-gray-500 font-medium">{def.suffix}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-gray-400" />
          Content Restrictions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESTRICTION_SETTINGS.map((def) => (
            <Card key={def.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                  <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-[#D80621]">
                    {def.icon}
                  </span>
                  {def.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">{def.description}</p>
                <div className="flex items-center gap-2">
                  {def.prefix && <span className="text-sm text-gray-500 font-medium">{def.prefix}</span>}
                  <Input
                    type={def.type}
                    min={def.min}
                    max={def.max}
                    value={values[def.key] || ""}
                    onChange={(e) => setValues(v => ({ ...v, [def.key]: e.target.value }))}
                    className="flex-1"
                  />
                  {def.suffix && <span className="text-sm text-gray-500 font-medium">{def.suffix}</span>}
                </div>
              </CardContent>
            </Card>
          ))}

          {TOGGLE_SETTINGS.map((def) => (
            <Card key={def.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                  <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-[#D80621]">
                    {def.icon}
                  </span>
                  {def.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">{def.description}</p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={values[def.key] === "true"}
                    onCheckedChange={(checked) => setValues(v => ({ ...v, [def.key]: checked ? "true" : "false" }))}
                  />
                  <Label className="text-sm text-gray-600">
                    {values[def.key] === "true" ? "Required" : "Optional"}
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-[#D80621] hover:bg-[#B00520] rounded-xl px-6"
          onClick={() => saveMutation.mutate(values)}
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
