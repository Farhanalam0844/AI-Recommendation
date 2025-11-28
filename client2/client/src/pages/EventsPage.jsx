import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  Skeleton
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import TodayIcon from "@mui/icons-material/Today";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../services/api";

const EventsPage = () => {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommended = () => {
    setLoading(true);
    api
      .get("/events/recommended")
      .then((res) => setEvents(res.data || []))
      .catch(() => {
        // fallback: try /events
        return api.get("/events").then((res2) => setEvents(res2.data || []));
      })
      .finally(() => setLoading(false));
  };

  const handleSearch = () => {
    setLoading(true);
    api
      .get("/events/search", { params: { q: query } })
      .then((res) => setEvents(res.data || []))
      .catch(() => fetchRecommended())
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecommended();
  }, []);

  const renderSkeletons = () => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <Grid item xs={12} md={4} key={idx}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
              <Skeleton width="60%" />
              <Skeleton width="40%" />
              <Skeleton width="80%" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, rgba(79,70,229,0.12), rgba(236,72,153,0.12))",
          border: "1px solid rgba(129,140,248,0.4)"
        }}
      >
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Discover events you&apos;ll love
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          These recommendations are based on your preferences. Search or refresh
          to explore more.
        </Typography>

        <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField
            placeholder="Search by keyword, artist, topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: 420 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading}
            startIcon={<SearchIcon />}
            sx={{ borderRadius: 999 }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={fetchRecommended}
            disabled={loading}
            startIcon={<RefreshIcon />}
            sx={{ borderRadius: 999 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {loading ? (
        renderSkeletons()
      ) : events.length === 0 ? (
        <Typography color="text.secondary">
          No events found. Try adjusting your search or preferences.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {events.map((event) => (
            <Grid item xs={12} md={4} key={event._id || event.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={1.5}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      noWrap
                      title={event.title}
                    >
                      {event.title || "Untitled event"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                    >
                      {event.description || "No description available."}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {event.location && (
                        <Chip
                          size="small"
                          icon={<LocationOnIcon />}
                          label={event.location}
                          variant="outlined"
                        />
                      )}
                      {event.date && (
                        <Chip
                          size="small"
                          icon={<TodayIcon />}
                          label={
                            typeof event.date === "string"
                              ? event.date.slice(0, 10)
                              : "Date"
                          }
                          variant="outlined"
                        />
                      )}
                      {event.price && (
                        <Chip
                          size="small"
                          icon={<AttachMoneyIcon />}
                          label={event.price}
                          variant="outlined"
                        />
                      )}
                      {event.source && (
                        <Chip
                          size="small"
                          label={event.source}
                          color="primary"
                          variant="filled"
                        />
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
                {event.url && (
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      href={event.url}
                      target="_blank"
                      rel="noreferrer"
                      variant="text"
                      size="small"
                    >
                      View details
                    </Button>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default EventsPage;
