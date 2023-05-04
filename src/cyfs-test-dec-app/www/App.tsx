import React, { useEffect } from 'react';
import styles from './App.module.less';
import { init } from '@/www/initialize';
import TestBoard from '@/www/pages/test_board/test_board';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
    useEffect(() => {
        init();
    }, []);
    return (
        <BrowserRouter>
            <div className={styles.app}>
                <TestBoard />
            </div>
        </BrowserRouter>
    );
}
