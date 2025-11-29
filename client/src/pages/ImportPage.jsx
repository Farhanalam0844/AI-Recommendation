// import React, { useState } from "react";
// import {
//   Box,
//   Typography,
//   Card,
//   CardContent,
//   Button,
//   Grid,
//   Stack,
//   Snackbar,
//   Alert
// } from "@mui/material";
// import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
// import api from "../services/api";

// const ImportPage = () => {
//   const [loadingSource, setLoadingSource] = useState("");
//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");

//   const runImport = async (source) => {
//     setLoadingSource(source);
//     setMessage("");
//     setError("");
//     try {
//       const res = await api.post(`/import/${source}`);
//       setMessage(res.data?.message || `Imported from ${source}`);
//     } catch (err) {
//       console.error(err);
//       setError(
//         err.response?.data?.message ||
//           `Failed to import from ${source.toUpperCase()}`
//       );
//     } finally {
//       setLoadingSource("");
//     }
//   };

//   return (
//     <Box>
//       <Typography variant="h5" fontWeight="bold" gutterBottom>
//         Import event data
//       </Typography>
//       <Typography variant="body2" color="text.secondary" gutterBottom>
//         Pull fresh event data from external platforms into your recommendation
//         engine.
//       </Typography>

//       <Grid container spacing={3} sx={{ mt: 1 }}>
//         <Grid item xs={12} md={6}>
//           <Card sx={{ borderRadius: 3 }}>
//             <CardContent>
//               <Stack spacing={1.5}>
//                 <Typography variant="h6">Eventbrite</Typography>
//                 <Typography variant="body2" color="text.secondary">
//                   Import upcoming events from Eventbrite that match your
//                   configured filters.
//                 </Typography>
//                 <Box>
//                   <Button
//                     variant="contained"
//                     startIcon={<CloudDownloadIcon />}
//                     onClick={() => runImport("eventbrite")}
//                     disabled={loadingSource === "eventbrite"}
//                     sx={{ borderRadius: 999 }}
//                   >
//                     {loadingSource === "eventbrite"
//                       ? "Importing..."
//                       : "Import from Eventbrite"}
//                   </Button>
//                 </Box>
//               </Stack>
//             </CardContent>
//           </Card>
//         </Grid>

//         <Grid item xs={12} md={6}>
//           <Card sx={{ borderRadius: 3 }}>
//             <CardContent>
//               <Stack spacing={1.5}>
//                 <Typography variant="h6">Ticketmaster</Typography>
//                 <Typography variant="body2" color="text.secondary">
//                   Import concerts, sports and more from Ticketmaster&apos;s
//                   discovery API.
//                 </Typography>
//                 <Box>
//                   <Button
//                     variant="contained"
//                     startIcon={<CloudDownloadIcon />}
//                     onClick={() => runImport("ticketmaster")}
//                     disabled={loadingSource === "ticketmaster"}
//                     sx={{ borderRadius: 999 }}
//                   >
//                     {loadingSource === "ticketmaster"
//                       ? "Importing..."
//                       : "Import from Ticketmaster"}
//                   </Button>
//                 </Box>
//               </Stack>
//             </CardContent>
//           </Card>
//         </Grid>
//       </Grid>

//       <Snackbar
//         open={!!message}
//         autoHideDuration={2500}
//         onClose={() => setMessage("")}
//       >
//         <Alert severity="success" variant="filled">
//           {message}
//         </Alert>
//       </Snackbar>

//       <Snackbar
//         open={!!error}
//         autoHideDuration={3000}
//         onClose={() => setError("")}
//       >
//         <Alert severity="error" variant="filled">
//           {error}
//         </Alert>
//       </Snackbar>
//     </Box>
//   );
// };

// export default ImportPage;
