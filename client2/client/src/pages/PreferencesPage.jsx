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
  Alert
} from "@mui/material";
import api from "../services/api";

const defaultPreferences = {
  location: "",
  maxDistanceKm: 10,
  budgetLevel: "medium",
  categories: ["music", "tech"],
  crowdSize: "any",
  indoorOutdoor: "any"
};

const categoriesOptions = [
  "music",
  "tech",
  "sports",
  "food",
  "networking",
  "family",
  "art",
  "education"
];

const PreferencesPage = () => {
  const [prefs, setPrefs] = useState(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/preferences")
      .then((res) => {
        if (res.data) setPrefs({ ...defaultPreferences, ...res.data });
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
          : [...p.categories, category]
      };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put("/preferences", prefs); // adjust to POST if your backend is different
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
        Tune these preferences to get better, personalised event
        recommendations.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Preferred Location"
                    name="location"
                    value={prefs.location}
                    onChange={handleChange}
                    fullWidth
                    placeholder="Melbourne, Sydney, online..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Max Distance (km)"
                    name="maxDistanceKm"
                    type="number"
                    value={prefs.maxDistanceKm}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Budget level"
                    name="budgetLevel"
                    value={prefs.budgetLevel}
                    onChange={handleChange}
                    fullWidth
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Crowd size"
                    name="crowdSize"
                    value={prefs.crowdSize}
                    onChange={handleChange}
                    fullWidth
                  >
                    <MenuItem value="small">Small & cosy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="large">Big events</MenuItem>
                    <MenuItem value="any">Doesn't matter</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    select
                    label="Indoor / outdoor"
                    name="indoorOutdoor"
                    value={prefs.indoorOutdoor}
                    onChange={handleChange}
                    fullWidth
                  >
                    <MenuItem value="indoor">Indoor</MenuItem>
                    <MenuItem value="outdoor">Outdoor</MenuItem>
                    <MenuItem value="any">No preference</MenuItem>
                  </TextField>
                </Grid>

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
