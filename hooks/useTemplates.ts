import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PastoTemplate } from '../types';

export function useTemplates() {
  const [templates, setTemplates] = useState<PastoTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('pasti_template')
      .select('*')
      .eq('attivo', true)
      .order('ordine', { ascending: true });

    if (!error && data) {
      setTemplates(data as PastoTemplate[]);
    }
    setLoading(false);
  };

  const getTemplatesByTipo = (tipo: PastoTemplate['tipo_pasto']) => {
    return templates.filter(t => t.tipo_pasto === tipo);
  };

  return { templates, loading, getTemplatesByTipo };
}
