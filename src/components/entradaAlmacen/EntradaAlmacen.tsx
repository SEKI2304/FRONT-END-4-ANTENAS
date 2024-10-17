import React, { useState, useEffect } from 'react';
import './EntradaAlmacen.scss';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { Card, CardContent, Typography, Grid, Box, Paper, Container } from '@mui/material';

// Definimos los tipos para Producto
interface Producto {
    id?: number; 
    Imagen: string;
    fecha: string;
    area: string;
    claveProducto: string;
    nombreProducto: string;
    pesoBruto: string | number;
    pesoNeto: string | number;
    pesoTarima: string | number;
    piezas: string | number;
    uom: string;
    fechaEntrada: string;
    productPrintCard: string;
}

const subject = new Subject<string>();

// Función para obtener datos del endpoint
const fetchData = async (epc: string): Promise<Producto | null> => {
    try {
        const response = await fetch(`http://172.16.10.31/api/socket/${epc}`);
        if (!response.ok) {
            throw new Error('Error al obtener los datos');
        }
        const data = await response.json();
        console.log("Datos obtenidos:", data);
        return data as Producto; 
    } catch (error) {
        console.error("Error al realizar la petición:", error);
        return null; 
    }
};

// Cargar datos
const loadData = async (epc: string, setProductos: React.Dispatch<React.SetStateAction<Producto[]>>) => {
    try {
        const data = await fetchData(epc);
        if (!data) {
            console.warn(`No se encontraron datos para el EPC: ${epc}`);
            return;
        }

        const imageResponse = await fetch(`http://172.16.10.31/api/Image/${data.productPrintCard}`);
        const imageData = await imageResponse.json();
        const imageBase64 = imageData.imageBase64 || 'https://www.jnfac.or.kr/img/noimage.jpg';

        setProductos((prev) => [
            {
                Imagen: imageBase64,
                fecha: data.fecha || 'N/A',
                area: data.area || 'N/A',
                claveProducto: data.claveProducto || 'N/A',
                nombreProducto: data.nombreProducto || 'N/A',
                pesoBruto: data.pesoBruto || 'N/A',
                pesoNeto: data.pesoNeto || 'N/A',
                pesoTarima: data.pesoTarima || 'N/A',
                piezas: data.piezas || 'N/A',
                uom: data.uom || 'N/A',
                fechaEntrada: data.fechaEntrada || 'N/A',
                productPrintCard: data.productPrintCard || 'N/A'
            },
            ...prev
        ]);
    } catch (error) {
        console.error("Error al cargar los datos del EPC:", error);
    }
};

const ProductDetail: React.FC = () => {
    const [productos, setProductos] = useState<Producto[]>([]);

    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5239/message")
            .configureLogging(signalR.LogLevel.Information)
            .build();
    
        connection.start()
            .then(() => {
                console.log("Conectado");
                connection.invoke("JoinGroup", "EntradaPT")
                    .then(() => console.log("Unido al grupo EntradaPT"))
                    .catch(err => console.error("Error al unirse al grupo:", err));
            })
            .catch((err) => console.error("Error de conexión:", err));
    
        connection.on("sendEpc", (message) => {
            subject.next(message);
        });
    
        const processMessage = (message: any) => {
            if (message && message.epc) {
                const epcSinEspacios = message.epc.replace(/\s+/g, '');
                loadData(epcSinEspacios, setProductos);
            } else {
                console.warn("Formato de mensaje incorrecto o faltan datos:", message);
            }
        };
    
        const subscription = subject.subscribe(processMessage);
    
        return () => {
            if (connection.state === signalR.HubConnectionState.Connected) {
                connection.invoke("LeaveGroup", "EntradaPT")
                    .then(() => {
                        console.log("Desconectado del grupo EntradaPT");
                        return connection.stop();
                    })
                    .catch(err => console.error("Error al salir del grupo:", err));
            } else {
                connection.stop().then(() => console.log("Conexión detenida"));
            }
    
            subscription.unsubscribe();
        };
    }, []);

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" align="center" gutterBottom>
                Entradas de Almacén
            </Typography>
            <Grid container spacing={3}>
                {productos.map((producto, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">
                                    Producto: {producto.nombreProducto}
                                </Typography>
                                <Typography variant="body2">
                                    Área: {producto.area}
                                </Typography>
                                <Typography variant="body2">
                                    Clave Producto: {producto.claveProducto}
                                </Typography>
                                <Typography variant="body2">
                                    Peso Neto: {producto.pesoNeto}
                                </Typography>
                                <Typography variant="body2">
                                    Piezas: {producto.piezas}
                                </Typography>
                                <Typography variant="body2">
                                    Unidad de Medida: {producto.uom}
                                </Typography>
                                <Typography variant="body2">
                                    Fecha de Entrada: {producto.fechaEntrada}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            {productos.length > 0 && (
                <Box sx={{ textAlign: 'center', marginTop: 3 }}>
                    <Paper elevation={3}>
                        <img 
                            src={productos[0].Imagen} 
                            alt="Imagen del Producto" 
                            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} 
                        />
                    </Paper>
                </Box>
            )}
        </Container>
    );
};

export default ProductDetail;