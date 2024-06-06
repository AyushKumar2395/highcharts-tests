'use client'
import React, { useEffect, useState, useRef } from 'react';
import Highcharts, { Options, SeriesColumnOptions, SeriesLineOptions } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import moment from 'moment';
import { T12hrdata, T15DayData, T1Daydata, T1Monthdata, T4Monthdata, TLivedata } from "../../data";

interface CpuData {
    DateTime: string;
    WinServer: string;
    PercentProcessorTimeCore: string;
    SqlServerCPU: number;
}

interface ProcessedCpuData {
    DateTime: string;
    Metric: {
        PercentProcessorTimeCore: { Core: string; Value: number; }[];
        SqlServerCPU: number;
    };
}

const CpuCoreComponent: React.FC = () => {
    const chartRef = useRef<HighchartsReact.RefObject>(null);
    const [series, setSeries] = useState<(SeriesColumnOptions | SeriesLineOptions)[]>([]);
    const [data, setData] = useState<typeof T12hrdata | typeof T15DayData | typeof T1Daydata | typeof T1Monthdata | typeof T4Monthdata | typeof TLivedata>(T12hrdata);
    const [isLiveData, setIsLiveData] = useState<boolean>(false);

    useEffect(() => {
        const processCpuData = (data: CpuData[]): ProcessedCpuData[] => {
            return data.map(entry => ({
                DateTime: entry.DateTime,
                Metric: {
                    PercentProcessorTimeCore: JSON.parse(entry.PercentProcessorTimeCore),
                    SqlServerCPU: entry.SqlServerCPU
                }
            }));
        };

        const generateCpuSeries = (processedData: ProcessedCpuData[]): (SeriesColumnOptions | SeriesLineOptions)[] => {
            const coreSeries: { [key: string]: SeriesColumnOptions } = {};
            const sqlServerCPU: SeriesLineOptions = {
                name: 'Sql Server CPU',
                data: [],
                stack: 'cpu',
                type: 'line',
                yAxis: 1
            };

            processedData.forEach((entry) => {
                entry.Metric.PercentProcessorTimeCore.forEach((coreEntry) => {
                    if (coreEntry.Core === "_total") return;
                    if (!coreSeries[coreEntry.Core]) {
                        coreSeries[coreEntry.Core] = {
                            name: `Core ${coreEntry.Core}`,
                            data: [],
                            stack: 'cores',
                            type: 'column'
                        };
                    }
                    coreSeries[coreEntry.Core]!.data!.push([new Date(entry.DateTime).getTime(), coreEntry.Value]);
                });
                sqlServerCPU.data!.push([new Date(entry.DateTime).getTime(), entry.Metric.SqlServerCPU]);
            });

            return [...Object.values(coreSeries), sqlServerCPU];
        };

        const processedData = processCpuData(data);
        const newSeries = generateCpuSeries(processedData);
        setSeries(newSeries);
    }, [data]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isLiveData) {
            interval = setInterval(() => {
                const demodata = {
                    "DateTime": new Date().toISOString(),
                    "WinServer": "CTS02",
                    "PercentProcessorTimeCore": JSON.stringify([
                        { "Core": "0", "Value": Math.ceil(Math.random() * 50) },
                        { "Core": "1", "Value": Math.ceil(Math.random() * 50) },
                        { "Core": "2", "Value": Math.ceil(Math.random() * 50) },
                        { "Core": "3", "Value": Math.ceil(Math.random() * 50) },
                        { "Core": "_total", "Value": Math.ceil(Math.random() * 200) }
                    ]),
                    "SqlServerCPU": Math.ceil(Math.random() * 50)
                };

                setData((prevData) => {
                    const newData = [...prevData, demodata];
                    if (newData.length > 0) {
                        newData.shift();
                    }
                    return newData;
                });
            }, 3000);
        }

        return () => clearInterval(interval);
    }, [isLiveData]);

    useEffect(() => {
        const chart = chartRef.current?.chart;
        if (chart) {
            const seriesMap: { [key: string]: Highcharts.Series } = {};
            chart.series.forEach((s) => {
                seriesMap[s.name] = s;
            });
    
            series.forEach((s) => {
                if (seriesMap[s.name!]) {
                    const seriesInstance = seriesMap[s.name!];
                    seriesInstance.update({
                        ...s
                    }, false);
                } else {
                    chart.addSeries(s, false);
                }
            });
    
            chart.redraw();
        }
    }, [series]);
    

    const handleDataChange = (newData: typeof T12hrdata | typeof T15DayData | typeof T1Daydata | typeof T1Monthdata | typeof T4Monthdata | typeof TLivedata) => {
        setData(newData);
        setIsLiveData(newData === TLivedata);
    };

    const options: Options = {
        chart: {
            type: 'column',
            zooming: { type: 'x' },
            panning: {
                enabled: true,
                type: 'x'
            },
            panKey: 'shift'
        },
        credits: {
            enabled: false
        },
        title: {
            text: 'CPU Core Usage (%)',
            align: 'left',
            style: {
                fontFamily: 'Poppins',
                fontWeight: '600',
                fontSize: '16px'
            }
        },
        xAxis: {
            type: 'datetime',
            crosshair: true,
        },
        yAxis: [
            {
                title: {
                    text: 'Value',
                },
                stackLabels: {
                    enabled: true,
                    formatter: function () {
                        return Highcharts.numberFormat(this.total!, 2) + ' %';
                    }
                },
                min: 0,
                max: 100,
                gridLineColor: 'rgba(128,128,128,0.7)',
                gridLineDashStyle: 'Dot'
            },
            {
                title: {
                    text: 'Sql Server CPU',
                },
                opposite: true,
                gridLineColor: 'rgba(128,128,128,0.7)',
                gridLineDashStyle: 'Dot'
            }
        ],
        tooltip: {
            shared: true,
            formatter: function () {
                let s = '<strong>' + moment.utc(this.x).format('lll') + '</strong><br/>';
                this.points?.forEach(point => {
                    s +=
                        '<span style="color:' +
                        point.series.color +
                        '">\u25CF</span> ' +
                        point.series.name +
                        ': <b>' +
                        point.y +
                        '%' +
                        '</b><br/>';
                });
                return s;
            },
            borderRadius: 5,
            followPointer: true
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: false,
                    format: '{y} %'
                },
                groupPadding: 0.3,
                pointPadding: 0.4,
                grouping: true,
            }
        },
        series: series
    };

    return (
        <div className="w-full card bg-base-100 rounded-sm">
            <div className="flex justify-center space-x-4 p-4">
                <button style={{ padding: "1vh 2vh", backgroundColor: "black", fontSize: "1rem", color: "white", borderRadius: "10px", cursor: "pointer" }} onClick={() => handleDataChange(TLivedata)}>Live</button>
                <button style={{ padding: "1vh 2vh", backgroundColor: "black", fontSize: "1rem", color: "white", borderRadius: "10px", cursor: "pointer" }} onClick={() => handleDataChange(T12hrdata)}>12 hr</button>
                <button style={{ padding: "1vh 2vh", backgroundColor: "black", fontSize: "1rem", color: "white", borderRadius: "10px", cursor: "pointer" }} onClick={() => handleDataChange(T1Daydata)}>1 day</button>
                <button style={{ padding: "1vh 2vh", backgroundColor: "black", fontSize: "1rem", color: "white", borderRadius: "10px", cursor: "pointer" }} onClick={() => handleDataChange(T15DayData)}>15 days</button>
                <button style={{ padding: "1vh 2vh", backgroundColor: "black", fontSize: "1rem", color: "white", borderRadius: "10px", cursor: "pointer" }} onClick={() => handleDataChange(T1Monthdata)}>1 month</button>
                <button style={{ padding: "1vh 2vh", backgroundColor: "black", fontSize: "1rem", color: "white", borderRadius: "10px", cursor: "pointer" }} onClick={() => handleDataChange(T4Monthdata)}>4 months</button>
            </div>
            <HighchartsReact options={options} ref={chartRef} highcharts={Highcharts} />
        </div>
    );
};

export default CpuCoreComponent;
