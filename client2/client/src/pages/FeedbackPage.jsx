import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert
} from "@mui/material";
import api from "../services/api";

const FeedbackPage = () => {
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/feedback", { rating, comment });
      setDone(true);
      setComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Share your feedback
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Help us improve the recommendation accuracy and user experience.
      </Typography>

      <Card sx={{ mt: 2, maxWidth: 600, borderRadius: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Overall experience
                </Typography>
                <Rating
                  name="overall-rating"
                  value={rating}
                  onChange={(_, value) => setRating(value || 0)}
                  size="large"
                />
              </Box>

              <TextField
                label="Comments (optional)"
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what worked well and what can be improved..."
              />

              <Box textAlign="right">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  sx={{ borderRadius: 999, px: 4 }}
                >
                  {saving ? "Submitting..." : "Submit feedback"}
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <Snackbar
        open={done}
        autoHideDuration={2500}
        onClose={() => setDone(false)}
      >
        <Alert severity="success" variant="filled">
          Thanks for your feedback!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackPage;
