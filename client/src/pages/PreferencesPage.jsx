import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../services/api";

const COUNTRY_OPTIONS = [
  { value: "US", label: "🇺🇸 United States" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "GB", label: "🇬🇧 United Kingdom" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "NZ", label: "🇳🇿 New Zealand" },
  { value: "IE", label: "🇮🇪 Ireland" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "ES", label: "🇪🇸 Spain" },
  { value: "IT", label: "🇮🇹 Italy" },
  { value: "SE", label: "🇸🇪 Sweden" },
  { value: "NO", label: "🇳🇴 Norway" },
  { value: "DK", label: "🇩🇰 Denmark" },
  { value: "CH", label: "🇨🇭 Switzerland" },
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "AE", label: "🇦🇪 United Arab Emirates" },
  { value: "SA", label: "🇸🇦 Saudi Arabia" },
  { value: "ZA", label: "🇿🇦 South Africa" },
  { value: "IN", label: "🇮🇳 India" },
  { value: "PK", label: "🇵🇰 Pakistan" },
  { value: "BD", label: "🇧🇩 Bangladesh" },
  { value: "SG", label: "🇸🇬 Singapore" },
  { value: "MY", label: "🇲🇾 Malaysia" },
  { value: "TH", label: "🇹🇭 Thailand" },
  { value: "PH", label: "🇵🇭 Philippines" },
  { value: "JP", label: "🇯🇵 Japan" },
  { value: "KR", label: "🇰🇷 South Korea" },
  { value: "BR", label: "🇧🇷 Brazil" },
  { value: "MX", label: "🇲🇽 Mexico" },
];

const categoriesOptions = [
  "music",
  "tech",
  "sports",
  "food",
  "networking",
  "family",
  "art",
  "education",
];

// ✅ Only keep what you want
const defaultPreferences = {
  preferredCountry: "AU", // change default if you want
  categories: ["music", "tech"],
};

const PreferencesPage = () => {
  const [prefs, setPrefs] = useState(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/preferences")
      .then((res) => {
        if (res.data) {
          // Keep only these two fields from backend response
          setPrefs({
            ...defaultPreferences,
            preferredCountry:
              res.data.preferredCountry ??
              res.data.location ?? // ✅ if your backend still uses "location" for country
              defaultPreferences.preferredCountry,
            categories: Array.isArray(res.data.categories)
              ? res.data.categories
              : defaultPreferences.categories,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrefs((p) => ({ ...p, [name]: value }));
  };

  const toggleCategory = (category) => {
    setPrefs((p) => {
      const exists = p.categories.includes(category);
      return {
        ...p,
        categories: exists
          ? p.categories.filter((c) => c !== category)
          : [...p.categories, category],
      };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // ✅ Send only preferredCountry + categories
      await api.put("/preferences", {
        preferredCountry: prefs.preferredCountry,
        categories: prefs.categories,
      });

      // If your backend expects "location" instead of "preferredCountry", use this instead:
      // await api.put("/preferences", { location: prefs.preferredCountry, categories: prefs.categories });

      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Your Preferences
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Choose your preferred country and categories to improve recommendations.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                {/* Preferred Country */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Preferred country"
                    name="preferredCountry"
                    value={prefs.preferredCountry}
                    onChange={handleChange}
                    fullWidth
                  >
                    {COUNTRY_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Categories */}
                <Grid item xs={12}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Favourite categories
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {categoriesOptions.map((cat) => {
                      const active = prefs.categories.includes(cat);
                      return (
                        <Chip
                          key={cat}
                          label={cat}
                          clickable
                          color={active ? "primary" : "default"}
                          variant={active ? "filled" : "outlined"}
                          onClick={() => toggleCategory(cat)}
                          sx={{ textTransform: "capitalize", mb: 1 }}
                        />
                      );
                    })}
                  </Stack>
                </Grid>

                {/* Save */}
                <Grid item xs={12} textAlign="right">
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading}
                    sx={{ borderRadius: 999, px: 4 }}
                  >
                    {loading ? "Saving..." : "Save preferences"}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
      >
        <Alert severity="success" variant="filled">
          Preferences saved!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PreferencesPage;
