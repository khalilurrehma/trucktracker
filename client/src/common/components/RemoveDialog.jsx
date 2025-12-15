import React from 'react';
import Button from '@mui/material/Button';
import { Snackbar } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import axios from 'axios';
import { useTranslation } from './LocalizationProvider';
import { useCatch } from '../../reactHelper';
import { snackBarDurationLongMs } from '../util/duration';

const useStyles = makeStyles((theme) => ({
  root: {
    [theme.breakpoints.down('md')]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(1)})`,
    },
  },
  button: {
    height: 'auto',
    marginTop: 0,
    marginBottom: 0,
  },
}));

const RemoveDialog = ({
  open, endpoint, itemId, onResult,
}) => {
  const classes = useStyles();
  const t = useTranslation();

  const handleRemove = useCatch(async () => {
    const baseUrl = import.meta.env.DEV
      ? import.meta.env.VITE_DEV_BACKEND_URL
      : import.meta.env.VITE_PROD_BACKEND_URL;

    // Delete from main device service
    const deviceResponse = await axios.delete(`${baseUrl}/new-devices/by_flespi/${itemId}`);
    if (deviceResponse.status !== 200) {
      throw new Error('Failed to delete from main device service');
    }

    // Delete from secondary system
    const secondaryResponse = await fetch(`/api/${endpoint}/${itemId}`, { method: 'DELETE' });
    if (!secondaryResponse.ok) {
      throw new Error(await secondaryResponse.text());
    }

    onResult(true);
  });

  return (
    <Snackbar
      className={classes.root}
      open={open}
      autoHideDuration={snackBarDurationLongMs}
      onClose={() => onResult(false)}
      message={t('sharedRemoveConfirm')}
      action={(
        <Button size="small" className={classes.button} color="error" onClick={handleRemove}>
          {t('sharedRemove')}
        </Button>
      )}
    />
  );
};

export default RemoveDialog;
